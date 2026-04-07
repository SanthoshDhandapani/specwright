interface EnvVars {
  BASE_URL: string;
  TEST_ENV: string;
  TEST_USERNAME?: string;
  TEST_PASSWORD?: string;
  [key: string]: string | undefined;
}

interface BootstrapResult {
  success: boolean;
  error?: string;
}

interface PermissionRequestData {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
}

interface ToolEventData {
  toolName: string;
  toolId: string;
  durationMs?: number;
}

interface ExploreResultData {
  url: string;
  title: string;
  summary: string;
  pageCount: number;
  error: string | null;
}

interface SpecwrightAPI {
  project: {
    pickFolder: () => Promise<string | null>;
    pickFiles: () => Promise<string[]>;
    uploadTestFile: (sourcePath: string) => Promise<string>;
    bootstrap: (folderPath: string) => Promise<BootstrapResult>;
    getPath: () => Promise<string>;
    setPath: (p: string) => Promise<void>;
    isBootstrapped: (p: string) => Promise<boolean>;
    readEnv: (p: string) => Promise<EnvVars>;
    writeEnv: (p: string, vars: EnvVars) => Promise<void>;
    readInstructions: (p: string) => Promise<object[]>;
    writeInstructions: (p: string, cards: object[]) => Promise<void>;
    readTemplates: (p: string) => Promise<Array<object & { templateName: string }>>;
    readCustomTemplates: (p: string) => Promise<Array<object & { templateName: string }>>;
    writeCustomTemplates: (p: string, templates: object[]) => Promise<void>;
    onBootstrapLog: (cb: (data: { line: string }) => void) => () => void;
  };
  pipeline: {
    start: (payload: {
      systemPromptPath?: string;
      systemPrompt?: string;
      userMessage: string;
      mode?: "claude-code";
      skipPermissions?: boolean;
    }) => Promise<void>;
    abort: () => Promise<void>;
    interrupt: () => Promise<void>;
    sendMessage: (text: string, priority?: "now" | "next") => Promise<void>;
    respondPermission: (requestId: string, allowed: boolean) => Promise<void>;
    readContextFiles: () => Promise<{ plan: string; seed: string; conventions: string }>;
    onToken: (cb: (data: { token: string }) => void) => () => void;
    onDone: (cb: (data: { fullText: string }) => void) => () => void;
    onError: (cb: (data: { error: string }) => void) => () => void;
    onLog: (cb: (data: { line: string }) => void) => () => void;
    onPermissionRequest: (cb: (data: PermissionRequestData) => void) => () => void;
    onToolStart: (cb: (data: ToolEventData) => void) => () => void;
    onToolEnd: (cb: (data: ToolEventData) => void) => () => void;
    onExploreResult: (cb: (data: ExploreResultData) => void) => () => void;
  };
}

declare global {
  interface Window {
    specwright: SpecwrightAPI;
  }
}

export {};
