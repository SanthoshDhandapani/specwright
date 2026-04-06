import { ipcMain, BrowserWindow } from "electron";
import { ClaudeAgentRunner } from "@specwright/agent-runner";
import type { McpServerConfig } from "@specwright/agent-runner";
import type { ConfigService } from "../services/ConfigService";
import type { ProjectService } from "../services/ProjectService";
import * as fs from "fs";
import * as path from "path";

let activeRunner: ClaudeAgentRunner | null = null;

// Pending permission requests: id → resolve function
const pendingPermissions = new Map<string, (allowed: boolean) => void>();

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

      // Append env credentials to user message
      let userMessage = payload.userMessage;
      if (projectPath) {
        const env = projectService.readEnv(projectPath);
        const lines: string[] = [];
        if (env.BASE_URL)       lines.push(`Base URL: ${env.BASE_URL}`);
        if (env.TEST_ENV)       lines.push(`Environment: ${env.TEST_ENV}`);
        if (env.TEST_USERNAME)  lines.push(`Username: ${env.TEST_USERNAME}`);
        if (env.TEST_PASSWORD)  lines.push(`Password: ${env.TEST_PASSWORD}`);
        const known = new Set(["BASE_URL", "TEST_ENV", "TEST_USERNAME", "TEST_PASSWORD"]);
        for (const [k, v] of Object.entries(env)) {
          if (!known.has(k) && v) lines.push(`${k}: ${v}`);
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

      const mcpServers: Record<string, McpServerConfig> = {
        "microsoft-playwright": {
          command: "npx",
          args: ["@playwright/mcp@latest", "--output-dir", screenshotDir],
        },
      };
      if (projectPath) {
        const mcpJsonPath = path.join(projectPath, ".mcp.json");
        if (fs.existsSync(mcpJsonPath)) {
          try {
            const mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
            const projectServers = mcpConfig.mcpServers ?? {};
            for (const [name, config] of Object.entries(projectServers)) {
              mcpServers[name] = config as McpServerConfig;
            }
            win.webContents.send("pipeline:log", {
              line: `[pipeline] MCP servers: ${Object.keys(mcpServers).join(", ")}`,
            });
          } catch {
            // ignore malformed .mcp.json
          }
        }
      }

      win.webContents.send("pipeline:log", {
        line: `[pipeline] Launching Claude Agent SDK…`,
      });

      activeRunner = new ClaudeAgentRunner();
      pendingPermissions.clear();

      try {
        const fullText = await activeRunner.run({
          systemPrompt,
          userMessage,
          cwd: projectPath,
          mcpServers,
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
            // Send permission request to renderer and wait for user response
            win.webContents.send("pipeline:permission-request", request);

            return new Promise<boolean>((resolve) => {
              pendingPermissions.set(request.id, resolve);
            });
          },
        });

        win.webContents.send("pipeline:done", { fullText });
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

  ipcMain.handle("pipeline:send-message", (_event, { text, priority }: { text: string; priority?: "now" | "next" }) => {
    if (activeRunner) {
      const win = getWindow();
      win?.webContents.send("pipeline:log", {
        line: `[user] ${text}`,
      });
      activeRunner.sendMessage(text, priority ?? "now");
    }
  });

  ipcMain.handle("pipeline:interrupt", async () => {
    if (activeRunner) {
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

    // Load agent prompts as conventions — these contain ALL coding rules,
    // feature file format, step definition patterns, FIELD_TYPES, etc.
    // This eliminates the need for Claude to re-read fixtures, testConfig, stepHelpers.
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

    // Also include testConfig.js content (routes, timeouts) — small file, avoids a Read call
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
