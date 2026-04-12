import { ipcMain, BrowserWindow } from "electron";
import * as fs from "fs";
import * as path from "path";
import type { ConfigService } from "../services/ConfigService";
import type { ProjectService, EnvVars, InstructionCard, PluginSource } from "../services/ProjectService";
import { log as fileLog } from "../logger";

export function registerProjectIpc(
  configService: ConfigService,
  projectService: ProjectService,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle("project:pick-folder", async () => {
    return configService.pickProjectFolder(getWindow());
  });

  ipcMain.handle("project:pick-files", async () => {
    return configService.pickFiles(getWindow());
  });

  // Copy a file into e2e-tests/data/migrations/files/ and return the relative path
  ipcMain.handle("project:upload-test-file", async (_event, sourcePath: string) => {
    const projPath = configService.getProjectPath();
    if (!projPath) throw new Error("No project path");
    const destDir = path.join(projPath, "e2e-tests/data/migrations/files");
    fs.mkdirSync(destDir, { recursive: true });
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);
    fs.copyFileSync(sourcePath, destPath);
    return `e2e-tests/data/migrations/files/${fileName}`;
  });

  ipcMain.handle("project:detect-plugin", (_event, p: string) => {
    return projectService.detectPlugin(p);
  });

  ipcMain.handle(
    "project:bootstrap",
    async (_event, folderPath: string, options?: { skipAuth?: boolean; authStrategy?: string; overlay?: PluginSource }) => {
    const win = getWindow();

    const sendLog = (line: string): void => {
      win?.webContents.send("project:bootstrap-log", { line });
      fileLog(line);
    };

    sendLog("[bootstrap] Starting…");

    if (options?.overlay) {
      const overlayLabel = options.overlay.type === "local" ? options.overlay.dirPath : options.overlay.packageName;
      sendLog(`[bootstrap] Overlay: ${overlayLabel}`);
    }

    const result = await projectService.bootstrap(folderPath, options, sendLog);

    if (result.success) {
      configService.setProjectPath(folderPath);
      sendLog("[bootstrap] Done.");
    } else {
      sendLog(`[bootstrap] Error: ${result.error}`);
    }
    return result;
  });

  // Validate a local directory as a Specwright plugin (3-level check)
  ipcMain.handle("project:validate-plugin", (_event, dirPath: string) => {
    return projectService.validateLocalPlugin(dirPath);
  });

  ipcMain.handle("project:get-path", () => {
    return configService.getProjectPath();
  });

  ipcMain.handle("project:set-path", (_event, p: string) => {
    configService.setProjectPath(p);
  });

  ipcMain.handle("project:is-bootstrapped", (_event, p: string) => {
    return projectService.isBootstrapped(p);
  });

  ipcMain.handle("project:read-env", (_event, p: string) => {
    return projectService.readEnv(p);
  });

  ipcMain.handle("project:write-env", (_event, p: string, vars: EnvVars) => {
    projectService.writeEnv(p, vars);
  });

  ipcMain.handle("project:read-instructions", (_event, p: string) => {
    return projectService.readInstructions(p);
  });

  ipcMain.handle("project:write-instructions", (_event, p: string, cards: InstructionCard[]) => {
    projectService.writeInstructions(p, cards);
  });

  // ── Templates ──

  ipcMain.handle("project:read-templates", (_event, p: string) => {
    return projectService.readExampleTemplates(p);
  });

  ipcMain.handle("project:read-custom-templates", (_event, p: string) => {
    return projectService.readCustomTemplates(p);
  });

  ipcMain.handle("project:write-custom-templates", (_event, p: string, templates: unknown[]) => {
    projectService.writeCustomTemplates(p, templates as Parameters<typeof projectService.writeCustomTemplates>[1]);
  });

  // Read test:bdd* scripts from project package.json → used to populate Run Tests picker
  ipcMain.handle("project:read-test-scripts", (_event, p: string): Record<string, string> => {
    const pkgPath = path.join(p, "package.json");
    if (!fs.existsSync(pkgPath)) return {};
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const scripts: Record<string, string> = pkg.scripts ?? {};
      return Object.fromEntries(
        Object.entries(scripts).filter(([k]) => k.startsWith("test:bdd"))
      );
    } catch {
      return {};
    }
  });

  // Scan e2e-tests/features/playwright-bdd/@Modules/ and @Workflows/ to discover
  // available test modules/workflows for the Run Tests picker.
  // Only returns directories that contain at least one .feature file (recursively).
  ipcMain.handle("project:read-feature-modules", (_event, p: string): { modules: string[]; workflows: string[] } => {
    const bddRoot = path.join(p, "e2e-tests/features/playwright-bdd");

    // A module is runnable only when it has BOTH a .feature file AND a steps.js
    const hasFile = (dir: string, predicate: (name: string) => boolean): boolean => {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isFile() && predicate(entry.name)) return true;
          if (entry.isDirectory() && hasFile(path.join(dir, entry.name), predicate)) return true;
        }
      } catch { /* ignore */ }
      return false;
    };

    const isRunnable = (dir: string): boolean =>
      hasFile(dir, n => n.endsWith(".feature")) &&
      hasFile(dir, n => n === "steps.js" || n === "steps.ts");

    const readDirs = (subDir: string): string[] => {
      const dir = path.join(bddRoot, subDir);
      if (!fs.existsSync(dir)) return [];
      try {
        return fs.readdirSync(dir, { withFileTypes: true })
          .filter(e => e.isDirectory() && e.name.startsWith("@") && isRunnable(path.join(dir, e.name)))
          .map(e => e.name); // e.g. "@Authentication", "@HomePage"
      } catch {
        return [];
      }
    };

    return {
      modules: readDirs("@Modules"),
      workflows: readDirs("@Workflows"),
    };
  });
}
