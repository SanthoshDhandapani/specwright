import { ipcMain, BrowserWindow } from "electron";
import * as fs from "fs";
import * as path from "path";
import type { ConfigService } from "../services/ConfigService";
import type { ProjectService, EnvVars, InstructionCard } from "../services/ProjectService";

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

  ipcMain.handle(
    "project:bootstrap",
    async (_event, folderPath: string, options?: { skipAuth?: boolean }) => {
    const win = getWindow();
    win?.webContents.send("project:bootstrap-log", { line: "[bootstrap] Starting…" });

    const result = await projectService.bootstrap(folderPath, options);

    if (result.success) {
      configService.setProjectPath(folderPath);
      win?.webContents.send("project:bootstrap-log", { line: "[bootstrap] Done." });
    } else {
      win?.webContents.send("project:bootstrap-log", {
        line: `[bootstrap] Error: ${result.error}`,
      });
    }
    return result;
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
}
