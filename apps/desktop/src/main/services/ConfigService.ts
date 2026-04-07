import { dialog, BrowserWindow } from "electron";

interface ConfigSchema {
  projectPath: string;
}

// electron-store v10 is ESM-only — must be loaded with dynamic import in CJS main process
type ElectronStore = import("electron-store").default<ConfigSchema>;

export class ConfigService {
  private store!: ElectronStore;

  async init(): Promise<void> {
    const { default: Store } = await import("electron-store");
    this.store = new Store<ConfigSchema>({
      name: "specwright-config",
      defaults: {
        projectPath: "",
      },
    });
  }

  getProjectPath(): string {
    return this.store.get("projectPath", "");
  }

  setProjectPath(p: string): void {
    this.store.set("projectPath", p);
  }

  async pickProjectFolder(parentWindow?: BrowserWindow | null): Promise<string | null> {
    const options = {
      title: "Select or Create Project Folder",
      properties: ["openDirectory", "createDirectory"] as const,
    };
    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, options)
      : await dialog.showOpenDialog(options);
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  }
}
