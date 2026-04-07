import { ipcMain, BrowserWindow } from "electron";
import { ClaudeAgentRunner, AiSdkRunner, PlaywrightMcpClient } from "@specwright/agent-runner";
import type { McpServerConfig } from "@specwright/agent-runner";
import type { ConfigService } from "../services/ConfigService";
import type { ProjectService } from "../services/ProjectService";
import * as fs from "fs";
import * as path from "path";

let activeRunner: ClaudeAgentRunner | AiSdkRunner | null = null;

// Pending permission requests: id → resolve function
const pendingPermissions = new Map<string, (allowed: boolean) => void>();
// Last completed session ID — used for resume
let lastSessionId: string | null = null;

export function registerPipelineIpc(
  configService: ConfigService,
  projectService: ProjectService,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(
    "pipeline:start",
    async (
      _event,
      payload: {
        systemPromptPath?: string;
        systemPrompt?: string;
        userMessage: string;
        mode?: "claude-code";
        skipPermissions?: boolean;
        /** Runner engine: "claude-agent-sdk" (default) or "ai-sdk" (Vercel AI SDK) */
        runner?: "claude-agent-sdk" | "ai-sdk";
        /** Resume a previous session instead of starting fresh */
        resumeSessionId?: string;
      }
    ) => {
      const win = getWindow();
      if (!win) return;

      const projectPath = configService.getProjectPath() || undefined;

      // Resolve system prompt
      let systemPrompt = payload.systemPrompt ?? "";
      if (!systemPrompt && payload.systemPromptPath) {
        try {
          const fs = await import("fs");
          systemPrompt = fs.readFileSync(payload.systemPromptPath, "utf-8");
        } catch (err) {
          win.webContents.send("pipeline:error", {
            error: `Failed to read system prompt: ${String(err)}`,
          });
          return;
        }
      }
      if (!systemPrompt) {
        systemPrompt = projectService.loadOrchestratorPrompt(projectPath);
      }

      // When skip permissions is enabled, tell the AI it doesn't need to ask
      if (payload.skipPermissions) {
        systemPrompt += `\n\nIMPORTANT: All tool permissions are pre-approved. Do NOT ask the user to grant permission or approve any tool call. Do NOT pause for approval. All tools execute automatically. Proceed directly.`;
      }

      // Browser exploration guidance — agents use Playwright MCP tools via skills
      systemPrompt += `\n\nBROWSER EXPLORATION:
The Playwright MCP server is available as "playwright-test" with browser tools (browser_navigate, browser_snapshot, browser_click, browser_type, etc.).
During Phase 4, invoke the /e2e-plan skill or the playwright-test-planner agent to explore the application.
The planner agent will:
1. Navigate to the pageURL from instructions.js
2. Take browser snapshots to discover elements (roles, names, data-testid attributes)
3. Click through navigation items, tabs, and interactive elements
4. Write a detailed seed file and test plan with validated selectors
5. Update agent memory with discovered patterns
Agent memory may contain useful selector patterns from previous runs — the planner agent verifies against live snapshots.

PHASE 7 PERFORMANCE:
After user approval (Phase 6), proceed DIRECTLY to BDD generation.
Do NOT spawn Explore or research sub-agents — the plan file and seed file already contain all context needed.
Read the plan file, read the seed file, then invoke @agent-bdd-generator followed by @agent-code-generator.
Generate the .feature and steps.js files directly without exploring the codebase first.`;

      // Append env credentials to user message (only pipeline-critical vars)
      let userMessage = payload.userMessage;
      if (projectPath) {
        const env = projectService.readEnv(projectPath);
        const lines: string[] = [];
        const PIPELINE_VARS = new Set(["BASE_URL", "TEST_ENV", "TEST_USERNAME", "TEST_PASSWORD"]);
        for (const [k, v] of Object.entries(env)) {
          if (PIPELINE_VARS.has(k) && v) lines.push(`${k}: ${v}`);
        }
        if (lines.length) {
          userMessage += `\n\n---\nEnvironment configuration:\n${lines.join("\n")}`;
          win.webContents.send("pipeline:log", {
            line: `[pipeline] Credentials injected (${lines.length} vars)`,
          });
        }
      }

      win.webContents.send("pipeline:log", {
        line: `[pipeline] System prompt: ${systemPrompt.length} chars`,
      });

      // Load MCP servers: project's .mcp.json + always include Playwright MCP
      const screenshotDir = projectPath
        ? path.join(projectPath, ".playwright-mcp")
        : ".playwright-mcp";

      // Load MCP servers: Playwright MCP for browser exploration + project servers from .mcp.json
      // Server name MUST be "playwright-test" to match agent frontmatter tool prefixes
      // (e.g., mcp__playwright-test__browser_navigate, mcp__playwright-test__browser_snapshot)
      const mcpServers: Record<string, McpServerConfig> = {
        "playwright-test": {
          command: "npx",
          args: [
            "@playwright/mcp@latest",
            ...(screenshotDir ? ["--output-dir", screenshotDir] : []),
          ],
        },
      };
      if (projectPath) {
        const mcpJsonPath = path.join(projectPath, ".mcp.json");
        if (fs.existsSync(mcpJsonPath)) {
          try {
            const mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
            const projectServers = mcpConfig.mcpServers ?? {};
            for (const [name, config] of Object.entries(projectServers)) {
              const cfg = config as Record<string, unknown>;
              // Skip non-stdio servers (streamable-http, sse) — Agent SDK only supports command-based
              if (cfg.type && cfg.type !== "stdio") continue;
              // Skip if already defined (e.g., playwright-test added above)
              if (mcpServers[name]) continue;
              mcpServers[name] = cfg as McpServerConfig;
            }
            win.webContents.send("pipeline:log", {
              line: `[pipeline] MCP servers: ${Object.keys(mcpServers).join(", ")}`,
            });
          } catch {
            // ignore malformed .mcp.json
          }
        }
      }

      const runnerType = payload.runner ?? "claude-agent-sdk";

      win.webContents.send("pipeline:log", {
        line: `[pipeline] Launching ${runnerType === "ai-sdk" ? "Vercel AI SDK" : "Claude Agent SDK"}…`,
      });

      pendingPermissions.clear();

      try {
        let fullText: string;

        if (runnerType === "ai-sdk") {
          // ── Vercel AI SDK runner ──
          // Native MCP discovery, prompt caching, streaming
          const aiRunner = new AiSdkRunner();
          activeRunner = aiRunner;

          fullText = await aiRunner.run({
            systemPrompt,
            userMessage,
            model: "claude-sonnet-4-6",
            mcpServers,
            includePlaywrightMcp: true,
            playwrightMcpArgs: screenshotDir
              ? ["--output-dir", screenshotDir]
              : [],
            maxSteps: 50,
            onToken: (token) => {
              win.webContents.send("pipeline:token", { token });
            },
            onLog: (line) => {
              win.webContents.send("pipeline:log", { line });
            },
            onToolStart: (toolName) => {
              win.webContents.send("pipeline:tool-start", { toolName, toolId: "" });
            },
            onToolEnd: (toolName, durationMs) => {
              win.webContents.send("pipeline:tool-end", { toolName, toolId: "", durationMs });
            },
            onStepFinish: (info) => {
              win.webContents.send("pipeline:log", {
                line: `[ai-sdk] Step ${info.stepNumber} — ${info.totalTokens} tokens, tools: ${info.toolCalls.join(", ") || "none"}`,
              });
            },
          });
        } else {
          // ── Claude Agent SDK runner (default) ──
          const agentRunner = new ClaudeAgentRunner();
          activeRunner = agentRunner;

          fullText = await agentRunner.run({
            systemPrompt,
            userMessage,
            cwd: projectPath,
            resumeSessionId: payload.resumeSessionId,
            mcpServers,
            skipPermissions: payload.skipPermissions,
            onToken: (token) => {
              win.webContents.send("pipeline:token", { token });
            },
            onLog: (line) => {
              win.webContents.send("pipeline:log", { line });
            },
            onToolStart: (toolName, toolId) => {
              win.webContents.send("pipeline:tool-start", { toolName, toolId });
            },
            onToolEnd: (toolName, toolId, durationMs) => {
              win.webContents.send("pipeline:tool-end", { toolName, toolId, durationMs });
            },
            onPermissionRequest: async (request) => {
              win.webContents.send("pipeline:permission-request", request);
              return new Promise<boolean>((resolve) => {
                pendingPermissions.set(request.id, resolve);
              });
            },
            onExplore: async (url: string) => {
              win.webContents.send("pipeline:log", {
                line: `[explorer] Starting browser exploration of ${url}`,
              });
              const explorer = new PlaywrightMcpClient();
              try {
                await explorer.connect({
                  outputDir: screenshotDir,
                  onLog: (line) => {
                    win.webContents.send("pipeline:log", { line });
                  },
                });
                // Stream exploration progress as live tokens
                win.webContents.send("pipeline:token", { token: "\n\n**Browser Exploration:**\n" });
                const result = await explorer.explore(url, undefined, (step) => {
                  win.webContents.send("pipeline:token", { token: `${step}\n` });
                });
                await explorer.disconnect();

                // Format snapshot for Claude's context injection
                const lines: string[] = [
                  `# Live Browser Exploration — ${result.title}`,
                  `URL: ${result.url}`,
                  "",
                  "## Accessibility Snapshot (landing page)",
                  result.snapshot,
                ];
                if (result.pageSnapshots.length > 0) {
                  lines.push("", "## Additional Page Snapshots");
                  for (const ps of result.pageSnapshots) {
                    lines.push(`\n### ${ps.url}`, ps.snapshot);
                  }
                }
                if (result.error) {
                  lines.push("", `## Exploration Error`, result.error);
                }
                return lines.join("\n");
              } catch (err) {
                const msg = `Exploration failed: ${String(err)}`;
                win.webContents.send("pipeline:log", {
                  line: `[explorer] ${msg}`,
                });
                try { await explorer.disconnect(); } catch { /* ignore */ }
                return null;
              }
            },
          });
        }

        // Save session ID for potential resume
        if (activeRunner instanceof ClaudeAgentRunner) {
          lastSessionId = activeRunner.getLastSessionId();
        }
        win.webContents.send("pipeline:done", { fullText, sessionId: lastSessionId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        win.webContents.send("pipeline:error", { error: msg });
      } finally {
        activeRunner = null;
        pendingPermissions.clear();
      }
    }
  );

  ipcMain.handle("pipeline:abort", () => {
    if (activeRunner) {
      activeRunner.abort();
      activeRunner = null;
      pendingPermissions.clear();
    }
  });

  ipcMain.handle("pipeline:send-message", (_event, { text, priority }: { text: string; priority?: "now" | "next" }): boolean => {
    if (activeRunner && activeRunner instanceof ClaudeAgentRunner) {
      const win = getWindow();
      win?.webContents.send("pipeline:log", { line: `[user] ${text}` });
      return activeRunner.sendMessage(text, priority ?? "now");
    }
    return false;
  });

  ipcMain.handle("pipeline:interrupt", async () => {
    if (activeRunner && activeRunner instanceof ClaudeAgentRunner) {
      const win = getWindow();
      win?.webContents.send("pipeline:log", {
        line: `[pipeline] Interrupted by user — Claude will pause and await instructions`,
      });
      await activeRunner.interrupt();
    }
  });

  ipcMain.handle(
    "pipeline:respond-permission",
    (_event, { requestId, allowed }: { requestId: string; allowed: boolean }) => {
      const resolve = pendingPermissions.get(requestId);
      if (resolve) {
        resolve(allowed);
        pendingPermissions.delete(requestId);
        const win = getWindow();
        win?.webContents.send("pipeline:log", {
          line: `[permission] ${allowed ? "Allowed" : "Denied"} (${requestId.slice(0, 8)}…)`,
        });
      }
    }
  );

  // Read context files (plan + seed) for continuation prompts
  ipcMain.handle("pipeline:read-context-files", async () => {
    const projPath = configService.getProjectPath();
    if (!projPath) return { plan: "", seed: "", conventions: "" };

    const readFile = (relPath: string): string => {
      const full = path.join(projPath, relPath);
      if (fs.existsSync(full)) return fs.readFileSync(full, "utf-8");
      return "";
    };

    // Find the most recent plan file
    const plansDir = path.join(projPath, "e2e-tests/plans");
    let planContent = "";
    if (fs.existsSync(plansDir)) {
      const planFiles = fs.readdirSync(plansDir)
        .filter(f => f.endsWith(".md") || f.endsWith("-plan.md"))
        .sort((a, b) => {
          const sa = fs.statSync(path.join(plansDir, a)).mtimeMs;
          const sb = fs.statSync(path.join(plansDir, b)).mtimeMs;
          return sb - sa; // newest first
        });
      if (planFiles.length > 0) {
        planContent = fs.readFileSync(path.join(plansDir, planFiles[0]), "utf-8");
      }
    }

    const seedContent = readFile("e2e-tests/playwright/generated/seed.spec.js");

    const agentFiles = [
      ".claude/agents/code-generator.md",
      ".claude/agents/bdd-generator.md",
    ];
    const agentContents: string[] = [];
    for (const rel of agentFiles) {
      const content = readFile(rel);
      if (content) {
        const body = content.replace(/^---[\s\S]*?---\n?/, "").trim();
        agentContents.push(`## ${path.basename(rel, ".md")} agent instructions\n\n${body}`);
      }
    }

    const testConfigContent = readFile("e2e-tests/data/testConfig.js");
    if (testConfigContent) {
      agentContents.push(`## testConfig.js (routes and timeouts)\n\`\`\`javascript\n${testConfigContent}\n\`\`\``);
    }

    const conventions = agentContents.length > 0
      ? agentContents.join("\n\n---\n\n")
      : [
          "- Import fixtures from: e2e-tests/playwright/fixtures.js",
          "- Shared steps in: e2e-tests/features/playwright-bdd/shared/",
          "- processDataTable + validateExpectations from: e2e-tests/utils/stepHelpers.js",
          "- 3-column data tables: Field Name | Value | Type",
        ].join("\n");

    return { plan: planContent, seed: seedContent, conventions };
  });
}
