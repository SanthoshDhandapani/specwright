import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("specwright", {
  project: {
    pickFolder: () => ipcRenderer.invoke("project:pick-folder"),
    bootstrap: (folderPath: string) => ipcRenderer.invoke("project:bootstrap", folderPath),
    getPath: () => ipcRenderer.invoke("project:get-path"),
    setPath: (p: string) => ipcRenderer.invoke("project:set-path", p),
    isBootstrapped: (p: string) => ipcRenderer.invoke("project:is-bootstrapped", p),
    readEnv: (p: string) => ipcRenderer.invoke("project:read-env", p),
    writeEnv: (p: string, vars: Record<string, string | undefined>) =>
      ipcRenderer.invoke("project:write-env", p, vars),
    readInstructions: (p: string) => ipcRenderer.invoke("project:read-instructions", p),
    writeInstructions: (p: string, cards: unknown[]) =>
      ipcRenderer.invoke("project:write-instructions", p, cards),
    readTemplates: (p: string) => ipcRenderer.invoke("project:read-templates", p),
    readCustomTemplates: (p: string) => ipcRenderer.invoke("project:read-custom-templates", p),
    writeCustomTemplates: (p: string, templates: unknown[]) =>
      ipcRenderer.invoke("project:write-custom-templates", p, templates),
    onBootstrapLog: (cb: (data: { line: string }) => void) => {
      ipcRenderer.on("project:bootstrap-log", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("project:bootstrap-log");
    },
  },

  pipeline: {
    start: (payload: {
      systemPromptPath?: string;
      systemPrompt?: string;
      userMessage: string;
      mode?: "claude-code";
    }) => ipcRenderer.invoke("pipeline:start", payload),

    abort: () => ipcRenderer.invoke("pipeline:abort"),
    interrupt: () => ipcRenderer.invoke("pipeline:interrupt"),
    sendMessage: (text: string, priority?: "now" | "next") =>
      ipcRenderer.invoke("pipeline:send-message", { text, priority }),
    respondPermission: (requestId: string, allowed: boolean) =>
      ipcRenderer.invoke("pipeline:respond-permission", { requestId, allowed }),
    readContextFiles: () =>
      ipcRenderer.invoke("pipeline:read-context-files") as Promise<{ plan: string; seed: string; conventions: string }>,

    onToken: (cb: (data: { token: string }) => void) => {
      ipcRenderer.on("pipeline:token", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("pipeline:token");
    },
    onDone: (cb: (data: { fullText: string }) => void) => {
      ipcRenderer.on("pipeline:done", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("pipeline:done");
    },
    onError: (cb: (data: { error: string }) => void) => {
      ipcRenderer.on("pipeline:error", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("pipeline:error");
    },
    onLog: (cb: (data: { line: string }) => void) => {
      ipcRenderer.on("pipeline:log", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("pipeline:log");
    },
    onPermissionRequest: (
      cb: (data: { id: string; toolName: string; toolInput: Record<string, unknown>; description: string }) => void
    ) => {
      ipcRenderer.on("pipeline:permission-request", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("pipeline:permission-request");
    },
    onToolStart: (cb: (data: { toolName: string; toolId: string }) => void) => {
      ipcRenderer.on("pipeline:tool-start", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("pipeline:tool-start");
    },
    onToolEnd: (cb: (data: { toolName: string; toolId: string; durationMs: number }) => void) => {
      ipcRenderer.on("pipeline:tool-end", (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners("pipeline:tool-end");
    },
  },
});
