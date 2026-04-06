/**
 * ClaudeAgentRunner — wraps @anthropic-ai/claude-agent-sdk for Specwright.
 *
 * Uses the official Agent SDK for native streaming, permission handling,
 * and tool call events — no stdout JSON parsing needed.
 */
// Dynamic import — Claude Agent SDK is ESM-only, but agent-runner compiles to CJS for Electron main process.
// We use new Function("specifier", "return import(specifier)") to prevent tsc from converting
// the dynamic import() into require() when compiling to CommonJS.
type QueryFn = typeof import("@anthropic-ai/claude-agent-sdk")["query"];
type PermissionResult = import("@anthropic-ai/claude-agent-sdk").PermissionResult;

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;

async function loadSDK(): Promise<{ query: QueryFn }> {
  const sdk = await dynamicImport("@anthropic-ai/claude-agent-sdk") as typeof import("@anthropic-ai/claude-agent-sdk");
  return { query: sdk.query };
}

export interface PermissionRequest {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
  title?: string;
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface AgentRunOptions {
  systemPrompt: string;
  userMessage: string;
  cwd?: string;
  model?: string;
  allowedTools?: string[];
  mcpServers?: Record<string, McpServerConfig>;
  onToken: (token: string) => void;
  onLog?: (line: string) => void;
  onToolStart?: (toolName: string, toolId: string) => void;
  onToolEnd?: (toolName: string, toolId: string, durationMs: number) => void;
  onPermissionRequest?: (request: PermissionRequest) => Promise<boolean>;
}

/** Build a human-readable description of what a tool call wants to do. */
function buildDescription(toolName: string, input: Record<string, unknown>): string {
  if (toolName === "Bash") return `Run command: ${input["command"] ?? ""}`;
  if (toolName === "Write") return `Write file: ${input["file_path"] ?? ""}`;
  if (toolName === "Edit") return `Edit file: ${input["file_path"] ?? ""}`;
  if (toolName === "Read") return `Read file: ${input["file_path"] ?? ""}`;
  if (toolName === "Glob") return `Search files: ${input["pattern"] ?? ""}`;
  if (toolName === "Grep") return `Search content: ${input["pattern"] ?? ""}`;
  if (toolName === "Agent") return `Launch agent: ${input["description"] ?? ""}`;
  return `Use tool: ${toolName}`;
}

/**
 * Simple async queue — push messages in, the SDK pulls them out via async iteration.
 * This keeps the session alive across multiple user/assistant turns.
 */
class MessageQueue {
  private queue: Array<{ type: "user"; message: { role: "user"; content: string }; parent_tool_use_id: null; priority?: "now" | "next" }> = [];
  private resolve: (() => void) | null = null;
  private closed = false;

  push(text: string, priority: "now" | "next" = "now"): void {
    this.queue.push({
      type: "user",
      message: { role: "user", content: text },
      parent_tool_use_id: null,
      priority,
    });
    this.resolve?.();
    this.resolve = null;
  }

  close(): void {
    this.closed = true;
    this.resolve?.();
    this.resolve = null;
  }

  async *[Symbol.asyncIterator]() {
    while (!this.closed) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
      } else {
        await new Promise<void>((r) => { this.resolve = r; });
      }
    }
    // Drain remaining
    while (this.queue.length > 0) {
      yield this.queue.shift()!;
    }
  }
}

type QueryFnReturn = ReturnType<QueryFn>;

export class ClaudeAgentRunner {
  private abortCtrl: AbortController | null = null;
  private activeQuery: QueryFnReturn | null = null;
  private messageQueue: MessageQueue | null = null;

  async run(options: AgentRunOptions): Promise<string> {
    const {
      systemPrompt,
      userMessage,
      cwd,
      model,
      allowedTools,
      mcpServers,
      onToken,
      onLog,
      onToolStart,
      onToolEnd,
      onPermissionRequest,
    } = options;

    this.abortCtrl = new AbortController();
    let fullText = "";

    // Track tool call timings and input details
    const toolTimings = new Map<string, {
      name: string;
      startMs: number;
      partialInput?: string;
      inputLogged?: boolean;
    }>();

    onLog?.(`[pipeline] Starting Claude Agent SDK…`);

    // Create message queue — push the initial message, SDK will pull it
    this.messageQueue = new MessageQueue();
    this.messageQueue.push(userMessage);

    try {
      const { query: sdkQuery } = await loadSDK();
      this.activeQuery = sdkQuery({
        prompt: this.messageQueue as unknown as AsyncIterable<{ type: "user"; message: { role: "user"; content: string }; parent_tool_use_id: null }>,
        options: {
          systemPrompt,
          cwd: cwd ?? process.cwd(),
          model,
          abortController: this.abortCtrl,
          includePartialMessages: true,

          // MCP servers (Playwright, e2e-automation, etc.)
          mcpServers: mcpServers ?? {},

          // Auto-allow safe tools; Bash still goes through canUseTool for approval
          allowedTools: allowedTools ?? [
            "Read", "Glob", "Grep", "Agent", "Skill", "ToolSearch",
            "Write", "Edit",  // file creation/editing is expected during generation
          ],

          // Permission callback — called for tools not in allowedTools
          canUseTool: async (
            toolName: string,
            input: Record<string, unknown>,
            opts
          ): Promise<PermissionResult> => {
            const title = opts.title ?? buildDescription(toolName, input);
            const description = opts.description ?? buildDescription(toolName, input);

            // If no permission handler provided, auto-allow
            if (!onPermissionRequest) {
              onLog?.(`[permission] Auto-allowing ${toolName} (no handler)`);
              return { behavior: "allow", updatedInput: input };
            }

            onLog?.(`[permission] ${toolName} — awaiting approval`);

            const allowed = await onPermissionRequest({
              id: opts.toolUseID,
              toolName,
              toolInput: input,
              description,
              title,
            });

            if (allowed) {
              onLog?.(`[permission] ${toolName} — allowed`);
              return { behavior: "allow", updatedInput: input };
            } else {
              onLog?.(`[permission] ${toolName} — denied`);
              return { behavior: "deny", message: "User denied this tool use" };
            }
          },
        },
      });

      onLog?.(`[pipeline] Session starting…`);

      // MCP status is logged via the "system" event handler below (mcp_servers field)

      for await (const message of this.activeQuery) {
        const type = (message as Record<string, unknown>).type as string;

        // Streaming text deltas
        if (type === "stream_event") {
          const event = (message as Record<string, unknown>).event as Record<string, unknown>;
          const eventType = event?.type as string;

          // Tool call started
          if (eventType === "content_block_start") {
            const block = event.content_block as Record<string, unknown>;
            if (block?.type === "tool_use") {
              const toolId = (block.id as string) ?? "";
              const toolName = (block.name as string) ?? "unknown";
              toolTimings.set(toolId, { name: toolName, startMs: Date.now() });
              onToolStart?.(toolName, toolId);
              onLog?.(`[tool] ${toolName} — started`);
            }
          }

          // Tool input streaming — capture input to show meaningful details
          if (eventType === "content_block_delta") {
            const delta = event.delta as Record<string, unknown>;
            if (delta?.type === "input_json_delta") {
              const chunk = (delta.partial_json as string) ?? "";
              if (chunk) {
                // Find the most recent un-logged tool
                for (const [, entry] of toolTimings) {
                  if (!entry.inputLogged) {
                    entry.partialInput = (entry.partialInput ?? "") + chunk;
                    // Extract summary from accumulated JSON fragments
                    const input = entry.partialInput;
                    let summary = "";
                    if (entry.name === "Bash") {
                      const m = input.match(/"command"\s*:\s*"([^"]{1,120})/);
                      if (m) summary = m[1];
                    } else if (entry.name === "Read" || entry.name === "Write" || entry.name === "Edit") {
                      const m = input.match(/"file_path"\s*:\s*"([^"]+)"/);
                      if (m) summary = m[1].split("/").slice(-2).join("/");
                    } else if (entry.name === "Glob") {
                      const m = input.match(/"pattern"\s*:\s*"([^"]+)"/);
                      if (m) summary = m[1];
                    } else if (entry.name === "Grep") {
                      const m = input.match(/"pattern"\s*:\s*"([^"]+)"/);
                      if (m) summary = m[1];
                    } else if (entry.name === "Agent") {
                      const m = input.match(/"description"\s*:\s*"([^"]{1,80})/);
                      if (m) summary = m[1];
                    } else if (entry.name === "Skill") {
                      const m = input.match(/"skill"\s*:\s*"([^"]+)"/);
                      if (m) summary = m[1];
                    }
                    if (summary && !entry.inputLogged) {
                      entry.inputLogged = true;
                      onLog?.(`[tool] ${entry.name}: ${summary}`);
                    }
                    break;
                  }
                }
              }
            }
          }

          // Text streaming
          if (eventType === "content_block_delta") {
            const delta = event.delta as Record<string, unknown>;
            if (delta?.type === "text_delta") {
              const token = (delta.text as string) ?? "";
              if (token) {
                fullText += token;
                onToken(token);
              }
            }
          }

          continue;
        }

        // Tool result — match by tool_use_id to log completion
        if (type === "user") {
          const msg = message as Record<string, unknown>;
          const msgContent = (msg.message as Record<string, unknown>);
          const content = (msgContent?.content as Array<Record<string, unknown>>) ?? [];
          for (const block of content) {
            if (block.type === "tool_result") {
              const toolUseId = (block.tool_use_id as string) ?? "";
              const entry = toolTimings.get(toolUseId);
              if (entry) {
                const elapsed = Date.now() - entry.startMs;
                toolTimings.delete(toolUseId);
                onToolEnd?.(entry.name, toolUseId, elapsed);
                onLog?.(`[tool] ${entry.name} — done (${(elapsed / 1000).toFixed(1)}s)`);
              }
            }
          }
          continue;
        }

        // Complete assistant message (non-streaming fallback)
        if (type === "assistant") {
          const msg = message as Record<string, unknown>;
          const msgContent = (msg.message as Record<string, unknown>);
          const content = (msgContent?.content as Array<Record<string, unknown>>) ?? [];
          for (const block of content) {
            if (block.type === "text") {
              const text = block.text as string;
              if (text && !fullText) {
                fullText += text;
                onToken(text);
              }
            }
          }
          continue;
        }

        // Result
        if (type === "result") {
          const result = message as Record<string, unknown>;
          const cost = (result.total_cost_usd as number) ?? 0;
          const ms = (result.duration_ms as number) ?? 0;
          onLog?.(`[pipeline] Done — ${ms}ms, cost $${cost.toFixed(4)}`);

          if (!fullText && result.result) {
            fullText = result.result as string;
            onToken(fullText);
          }
          continue;
        }

        // System init
        if (type === "system") {
          const sys = message as Record<string, unknown>;
          const model = sys.model as string ?? "";
          onLog?.(`[pipeline] Session ${sys.session_id ?? ""} model=${model}`);

          // Log MCP server status from system init event
          const mcpStatus = sys.mcp_servers as Array<Record<string, unknown>> ?? [];
          for (const server of mcpStatus) {
            const name = server.name as string;
            const status = server.status as string;
            if (status === "connected") {
              onLog?.(`[mcp] ✓ ${name}`);
            } else if (status === "failed") {
              onLog?.(`[mcp] ✕ ${name} — FAILED`);
            } else if (status === "needs-auth") {
              onLog?.(`[mcp] ⚠ ${name} — needs auth`);
            }
          }
          continue;
        }
      }
    } catch (err) {
      if (this.abortCtrl?.signal.aborted) {
        onLog?.(`[pipeline] Aborted by user`);
      } else {
        throw err;
      }
    } finally {
      this.messageQueue?.close();
      this.activeQuery = null;
      this.abortCtrl = null;
      this.messageQueue = null;
    }

    return fullText;
  }

  /**
   * Send a message to the running session without stopping it.
   * Pushes to the message queue — the SDK picks it up as the next user turn.
   */
  sendMessage(text: string, priority: "now" | "next" = "now"): void {
    if (this.messageQueue) {
      this.messageQueue.push(text, priority);
    }
  }

  /**
   * Interrupt the current turn — Claude stops and waits for new input.
   * Softer than abort — the session stays alive.
   */
  async interrupt(): Promise<void> {
    if (!this.activeQuery) return;
    try {
      await this.activeQuery.interrupt();
    } catch {
      // ignore if already stopped
    }
  }

  /**
   * Abort the session completely — kills the process.
   * Wrapped in try-catch to suppress EPIPE errors from broken pipes.
   */
  abort(): void {
    try { this.messageQueue?.close(); } catch { /* ignore */ }
    try { this.abortCtrl?.abort(); } catch { /* ignore */ }
    try { this.activeQuery?.close(); } catch { /* ignore */ }
    this.activeQuery = null;
    this.abortCtrl = null;
    this.messageQueue = null;
  }
}
