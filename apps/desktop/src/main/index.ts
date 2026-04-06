import { app, BrowserWindow, shell } from "electron";
import { join } from "path";
import { ConfigService } from "./services/ConfigService";
import { ProjectService } from "./services/ProjectService";
import { registerConfigIpc } from "./ipc/config.ipc";
import { registerProjectIpc } from "./ipc/project.ipc";
import { registerPipelineIpc } from "./ipc/pipeline.ipc";

// Suppress EPIPE errors from aborted pipeline processes — these are expected
// when the user clicks Abort and the SDK process is killed mid-write.
process.on("uncaughtException", (err) => {
  if (err.message?.includes("EPIPE") || err.message?.includes("write EPIPE")) {
    console.warn("[main] Suppressed EPIPE error (pipeline aborted)");
    return;
  }
  // Re-throw non-EPIPE errors
  console.error("[main] Uncaught exception:", err);
});

let mainWindow: BrowserWindow | null = null;

const configService = new ConfigService();
// Resources live at src/main/resources/ (resolved relative to __dirname in dev)
const projectService = new ProjectService(join(__dirname, "resources"));

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Specwright",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  // Init store (dynamic import required for ESM-only electron-store v10)
  await configService.init();

  const win = createWindow();

  registerConfigIpc(configService);
  registerProjectIpc(configService, projectService, () => mainWindow);
  registerPipelineIpc(configService, projectService, () => mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  win.on("ready-to-show", () => {
    win.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
