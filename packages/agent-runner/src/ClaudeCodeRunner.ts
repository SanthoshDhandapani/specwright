import { execSync, spawn } from "child_process";
import * as readline from "readline";
import type { ChildProcess } from "child_process";

export interface ClaudeAuthStatus {
  loggedIn: boolean;
  email?: string;
  authMethod?: string;
  subscriptionType?: string;
}

export interface PermissionRequest {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
}

export interface ClaudeRunOptions {
  systemPrompt: string;
  userMessage: string;
  cwd?: string;
  model?: string;
  onToken: (token: string) => void;
  onLog?: (line: string) => void;
  onPermissionRequest?: (request: PermissionRequest) => void;
}

/**
 * Build the best possible PATH for finding `claude`.
 */
function buildResolvedPath(): string {
  const home = process.env.HOME ?? "";
  const current = process.env.PATH ?? "";

  const common = [
    `${home}/.npm-global/bin`,
    `${home}/.local/bin`,
    `${home}/bin`,
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];

  let loginPath = "";
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    loginPath = execSync(`${shell} -l -c 'echo $PATH'`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
  } catch {
    // login-shell call failed — no problem, we have current + common
  }

  const parts = [
    ...current.split(":"),
    ...loginPath.split(":"),
    ...common,
  ];
  const deduped = [...new Set(parts)].filter(Boolean);
  return deduped.join(":");
}

const RESOLVED_PATH = buildResolvedPath();

export function getClaudeAuthStatus(): ClaudeAuthStatus {
  try {
    const output = execSync("claude auth status", {
      encoding: "utf-8",
      timeout: 5000,
      env: { ...process.env, PATH: RESOLVED_PATH, CLAUDECODE: undefined },
    });
    const parsed = JSON.parse(output.trim());
    return { loggedIn: Boolean(parsed.loggedIn), ...parsed };
  } catch {
    return { loggedIn: false };
  }
}

export class ClaudeCodeRunner {
  private proc: ChildProcess | null = null;

  async run(options: ClaudeRunOptions): Promise<string> {
    const { systemPrompt, userMessage, cwd, model, onToken, onLog, onPermissionRequest } = options;

    const args: string[] = [
      "--print",
      "--verbose",
      "--output-format", "stream-json",
      "--include-partial-messages",
      "--dangerously-skip-permissions",  // required for non-interactive --print mode
      "--input-format", "stream-json",   // allow mid-run user messages via stdin
      "--system-prompt", systemPrompt,
    ];

    if (model) args.push("--model", model);

    onLog?.(`[pipeline] Starting Claude Code CLI…`);

    return new Promise((resolve, reject) => {
      this.proc = spawn("claude", args, {
        cwd: cwd ?? process.cwd(),
        shell: false,
        env: { ...process.env, PATH: RESOLVED_PATH, CLAUDECODE: undefined },
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Write initial user message as stream-json
      const initialMsg = JSON.stringify({
        type: "user",
        message: { role: "user", content: userMessage },
      });
      this.proc.stdin!.write(initialMsg + "\n");

      this.proc.on("error", (err: Error) => {
        const msg =
          err.message.includes("ENOENT")
            ? `claude binary not found in PATH. Make sure 'claude' is installed and accessible from your terminal. PATH used: ${RESOLVED_PATH.slice(0, 200)}`
            : `Failed to spawn claude: ${err.message}`;
        onLog?.(`[pipeline] ERROR: ${msg}`);
        this.proc = null;
        reject(new Error(msg));
      });

      const rl = readline.createInterface({ input: this.proc.stdout! });
      let fullText = "";

      // Track active tool calls: id → { name, startMs }
      const activeTools = new Map<string, { name: string; startMs: number }>();

      rl.on("line", (line: string) => {
        if (!line.trim()) return;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line);
        } catch {
          onLog?.(`[claude] ${line}`);
          return;
        }

        const type = event["type"] as string;

        // Partial streaming token (with --include-partial-messages)
        if (type === "stream_event") {
          const inner = event["event"] as Record<string, unknown>;
          const innerType = inner?.["type"] as string;

          // Tool call starting — track id+name and show in terminal
          if (innerType === "content_block_start") {
            const block = inner["content_block"] as Record<string, unknown>;
            if (block?.["type"] === "tool_use") {
              const toolId   = (block["id"]   as string) ?? "";
              const toolName = (block["name"] as string) ?? "unknown";
              activeTools.set(toolId, { name: toolName, startMs: Date.now() });
              onLog?.(`[tool] ${toolName} — started`);
            }
          }

          // Text token streaming
          if (
            innerType === "content_block_delta" &&
            (inner["delta"] as Record<string, unknown>)?.["type"] === "text_delta"
          ) {
            const token = ((inner["delta"] as Record<string, unknown>)["text"] as string) ?? "";
            if (token) {
              fullText += token;
              onToken(token);
            }
          }
          return;
        }

        // Tool use result — match by id so we know which tool finished
        if (type === "user") {
          const msg = event["message"] as Record<string, unknown>;
          const content = (msg?.["content"] as Array<Record<string, unknown>>) ?? [];
          for (const block of content) {
            if (block["type"] === "tool_result") {
              const toolUseId = (block["tool_use_id"] as string) ?? "";
              const entry = activeTools.get(toolUseId);
              if (entry) {
                const elapsed = ((Date.now() - entry.startMs) / 1000).toFixed(1);
                activeTools.delete(toolUseId);
                onLog?.(`[tool] ${entry.name} — done (${elapsed}s)`);
              }
              // Skip logging untracked tool results — they're just noise
            }
          }
          return;
        }

        // Permission request from Claude CLI (PreToolUse hook or permission system)
        if (type === "permission_request") {
          const toolName = (event["tool_name"] as string) ?? "unknown";
          const toolInput = (event["tool_input"] as Record<string, unknown>) ?? {};
          const requestId = (event["id"] as string) ?? `perm-${Date.now()}`;
          const description = (event["description"] as string) ??
            this.buildPermissionDescription(toolName, toolInput);

          onLog?.(`[permission] ${toolName} — awaiting user approval`);

          if (onPermissionRequest) {
            onPermissionRequest({ id: requestId, toolName, toolInput, description });
          }
          return;
        }

        // Complete assistant turn (non-streaming fallback)
        if (type === "assistant") {
          const msg = event["message"] as Record<string, unknown>;
          const content = (msg?.["content"] as Array<Record<string, unknown>>) ?? [];
          for (const block of content) {
            if (block["type"] === "text" && !fullText) {
              const text = block["text"] as string;
              for (const char of text) {
                fullText += char;
                onToken(char);
              }
            }
          }
          return;
        }

        // Final result
        if (type === "result") {
          const sub = event["subtype"] as string;
          if (sub === "error" || event["is_error"]) {
            onLog?.(`[pipeline] Error: ${JSON.stringify(event)}`);
          } else {
            const cost = (event["total_cost_usd"] as number) ?? 0;
            const ms = (event["duration_ms"] as number) ?? 0;
            onLog?.(`[pipeline] Done — ${ms}ms, cost $${cost.toFixed(4)}`);
            if (!fullText && event["result"]) {
              const text = event["result"] as string;
              for (const char of text) {
                fullText += char;
                onToken(char);
              }
            }
          }
          return;
        }

        // System / init
        if (type === "system") {
          onLog?.(`[pipeline] Session ${event["session_id"] ?? ""} model=${event["model"] ?? ""}`);
          return;
        }
      });

      this.proc.stderr!.on("data", (chunk: Buffer | string) => {
        const text = typeof chunk === "string" ? chunk : chunk.toString();
        text.split("\n").filter(Boolean).forEach((l) => onLog?.(`[claude stderr] ${l}`));
      });

      this.proc.on("close", (code: number | null) => {
        this.proc = null;
        if (code === 0 || code === null) {
          resolve(fullText);
        } else {
          reject(new Error(`claude exited with code ${code}`));
        }
      });
    });
  }

  /** Build a human-readable description of what a tool call wants to do. */
  private buildPermissionDescription(toolName: string, toolInput: Record<string, unknown>): string {
    if (toolName === "Bash") {
      return `Run command: ${toolInput["command"] ?? ""}`;
    }
    if (toolName === "Write") {
      return `Write file: ${toolInput["file_path"] ?? ""}`;
    }
    if (toolName === "Edit") {
      return `Edit file: ${toolInput["file_path"] ?? ""}`;
    }
    if (toolName === "Read") {
      return `Read file: ${toolInput["file_path"] ?? ""}`;
    }
    return `Use tool: ${toolName}`;
  }

  /** Respond to a permission request — allow or deny. */
  respondPermission(requestId: string, allowed: boolean): void {
    if (this.proc?.stdin && !this.proc.stdin.destroyed) {
      const response = JSON.stringify({
        type: "permission_response",
        id: requestId,
        allowed,
      });
      this.proc.stdin.write(response + "\n");
    }
  }

  /** Inject a follow-up user message into the running session via stdin. */
  sendMessage(text: string): void {
    if (this.proc?.stdin && !this.proc.stdin.destroyed) {
      const msg = JSON.stringify({
        type: "user",
        message: { role: "user", content: text },
      });
      this.proc.stdin.write(msg + "\n");
    }
  }

  abort(): void {
    if (this.proc) {
      try { this.proc.stdin?.end(); } catch { /* ignore */ }
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
  }
}
