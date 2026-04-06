import { ipcMain } from "electron";
import type { ConfigService } from "../services/ConfigService";

export function registerConfigIpc(configService: ConfigService): void {
  ipcMain.handle("config:get-path", () => {
    return configService.getProjectPath();
  });

  ipcMain.handle("config:set-path", (_event, p: string) => {
    configService.setProjectPath(p);
  });
}
