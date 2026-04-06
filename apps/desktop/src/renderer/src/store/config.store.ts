import { create } from "zustand";

export type ProjectState = "none" | "bootstrapping" | "ready" | "error";

export interface EnvVars {
  BASE_URL: string;
  TEST_ENV: string;
  TEST_USERNAME?: string;
  TEST_PASSWORD?: string;
  [key: string]: string | undefined;
}

interface ConfigState {
  projectPath: string;
  projectState: ProjectState;
  envVars: EnvVars;
  bootstrapLog: string[];
  loaded: boolean;
  skipPermissions: boolean;

  hydrate: () => Promise<void>;
  pickAndBootstrap: () => Promise<void>;
  loadExistingProject: (folderPath: string) => Promise<void>;
  setEnvVar: (key: string, value: string) => void;
  removeEnvVar: (key: string) => void;
  saveEnv: () => Promise<void>;
  appendBootstrapLog: (line: string) => void;
  setSkipPermissions: (skip: boolean) => void;
}

const DEFAULT_ENV: EnvVars = { BASE_URL: "", TEST_ENV: "qat" };

export const useConfigStore = create<ConfigState>((set, get) => ({
  projectPath: "",
  projectState: "none",
  envVars: { ...DEFAULT_ENV },
  bootstrapLog: [],
  loaded: false,
  skipPermissions: true,

  hydrate: async () => {
    const projectPath = await window.specwright.project.getPath();
    if (!projectPath) {
      set({ loaded: true, projectState: "none" });
      return;
    }

    const isReady = await window.specwright.project.isBootstrapped(projectPath);
    if (isReady) {
      const envVars = await window.specwright.project.readEnv(projectPath);
      set({ projectPath, projectState: "ready", envVars, loaded: true });
    } else {
      set({ projectPath, projectState: "none", loaded: true });
    }
  },

  pickAndBootstrap: async () => {
    const folder = await window.specwright.project.pickFolder();
    if (!folder) return;

    // Check if already bootstrapped
    const isReady = await window.specwright.project.isBootstrapped(folder);
    if (isReady) {
      await get().loadExistingProject(folder);
      return;
    }

    set({ projectPath: folder, projectState: "bootstrapping", bootstrapLog: [] });

    const result = await window.specwright.project.bootstrap(folder);
    if (result.success) {
      const envVars = await window.specwright.project.readEnv(folder);
      set({ projectState: "ready", envVars });
    } else {
      set({ projectState: "error" });
    }
  },

  loadExistingProject: async (folderPath: string) => {
    await window.specwright.project.setPath(folderPath);
    const envVars = await window.specwright.project.readEnv(folderPath);
    set({ projectPath: folderPath, projectState: "ready", envVars });
  },

  setEnvVar: (key, value) => {
    set((s) => ({ envVars: { ...s.envVars, [key]: value } }));
  },

  removeEnvVar: (key) => {
    set((s) => {
      const next = { ...s.envVars };
      delete next[key];
      return { envVars: next };
    });
  },

  saveEnv: async () => {
    const { projectPath, envVars } = get();
    if (!projectPath) return;
    await window.specwright.project.writeEnv(projectPath, envVars);
  },

  appendBootstrapLog: (line) => {
    set((s) => ({ bootstrapLog: [...s.bootstrapLog, line] }));
  },

  setSkipPermissions: (skip) => {
    set({ skipPermissions: skip });
  },
}));
