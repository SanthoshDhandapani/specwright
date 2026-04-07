import { create } from "zustand";

export type PhaseStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface Phase {
  id: number;
  label: string;
  agentName: string | null;
  status: PhaseStatus;
  startedAt: number | null;
  durationMs: number | null;
}

export type PipelineStatus = "idle" | "running" | "done" | "error" | "aborted";

export interface ExploreResult {
  url: string;
  title: string;
  summary: string;
  pageCount: number;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "explore";
  content: string;
  isStreaming: boolean;
  exploreResult?: ExploreResult;
}

export interface PendingPermission {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
  timestamp: number;
}

interface PipelineState {
  status: PipelineStatus;
  messages: ChatMessage[];
  logLines: string[];
  activePhase: number;
  phases: Phase[];
  errorMessage: string | null;
  pendingPermission: PendingPermission | null;
  /** Currently running tool name (shown in chat while streaming pauses) */
  activeTool: string | null;

  startRun: (userMessage: string) => void;
  injectUserMessage: (text: string) => void;
  appendToken: (token: string) => void;
  appendLog: (line: string) => void;
  finishRun: (fullText: string) => void;
  setError: (msg: string) => void;
  clearFeed: () => void;
  setActivePhase: (id: number) => void;
  setPhaseStatus: (id: number, status: PhaseStatus, durationMs?: number) => void;
  showPermission: (request: PendingPermission) => void;
  clearPermission: () => void;
  setActiveTool: (toolName: string | null) => void;
  appendExploreResult: (data: ExploreResult) => void;
}

// Phases match SKILL.md /e2e-automate pipeline exactly
// Single source of truth for pipeline phases — update this array when phases change.
const PHASES: Phase[] = [
  { id: 1,  label: "Initialization",           agentName: null,                        status: "pending", startedAt: null, durationMs: null },
  { id: 2,  label: "Detection & Routing",      agentName: null,                        status: "pending", startedAt: null, durationMs: null },
  { id: 3,  label: "/e2e-process",             agentName: "input-processor",           status: "pending", startedAt: null, durationMs: null },
  { id: 4,  label: "/e2e-plan",                agentName: "playwright-test-planner",   status: "pending", startedAt: null, durationMs: null },
  { id: 5,  label: "/e2e-validate",            agentName: "execution-manager",         status: "pending", startedAt: null, durationMs: null },
  { id: 6,  label: "User Approval",            agentName: null,                        status: "pending", startedAt: null, durationMs: null },
  { id: 7,  label: "/e2e-generate",            agentName: "bdd-generator",             status: "pending", startedAt: null, durationMs: null },
  { id: 8,  label: "/e2e-heal",                agentName: "execution-manager",         status: "pending", startedAt: null, durationMs: null },
  { id: 9,  label: "Cleanup",                  agentName: null,                        status: "pending", startedAt: null, durationMs: null },
  { id: 10, label: "Final Review",             agentName: null,                        status: "pending", startedAt: null, durationMs: null },
];

/** Derived constants — all phase logic should reference these, not hardcoded numbers. */
export const PHASE_COUNT = PHASES.length;
export const MAX_PHASE_ID = PHASES[PHASES.length - 1].id;
/** The phase where BDD generation starts — "Run Tests" is available once this phase is done. */
export const BDD_GENERATION_PHASE_ID = PHASES.find((p) => p.label === "/e2e-generate")!.id;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  status: "idle",
  messages: [],
  logLines: [],
  activePhase: 0,
  phases: PHASES.map((p) => ({ ...p })),
  errorMessage: null,
  pendingPermission: null,
  activeTool: null,

  startRun: (userMessage) =>
    set((s) => ({
      status: "running",
      logLines: [],
      activePhase: 1,
      errorMessage: null,
      pendingPermission: null,
      phases: PHASES.map((p) => ({ ...p })),
      messages: [
        // Clear isStreaming on all previous messages
        ...s.messages.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m),
        { id: makeId(), role: "user",      content: userMessage, isStreaming: false },
        { id: makeId(), role: "assistant", content: "",          isStreaming: true  },
      ],
    })),

  injectUserMessage: (text) =>
    set((s) => ({
      messages: [
        // Clear isStreaming on all previous messages
        ...s.messages.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m),
        { id: makeId(), role: "user",      content: text, isStreaming: false },
        { id: makeId(), role: "assistant", content: "",   isStreaming: true  },
      ],
    })),

  appendToken: (token) =>
    set((s) => {
      const messages = [...s.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = {
          ...messages[lastIdx],
          content: messages[lastIdx].content + token,
        };
      }
      return { messages };
    }),

  appendLog: (line) =>
    set((s) => ({ logLines: [...s.logLines, line] })),

  finishRun: (_fullText) =>
    set((s) => {
      const messages = [...s.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = { ...messages[lastIdx], isStreaming: false };
      }
      return { messages, status: "done", pendingPermission: null };
    }),

  setError: (msg) =>
    set((s) => {
      const messages = [...s.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = {
          ...messages[lastIdx],
          content: messages[lastIdx].content || `Error: ${msg}`,
          isStreaming: false,
        };
      }
      return { messages, status: "error", errorMessage: msg, pendingPermission: null };
    }),

  clearFeed: () =>
    set({
      status: "idle",
      messages: [],
      logLines: [],
      activePhase: 0,
      errorMessage: null,
      pendingPermission: null,
      phases: PHASES.map((p) => ({ ...p })),
    }),

  setActivePhase: (id) =>
    set((s) => ({
      activePhase: id,
      phases: s.phases.map((p) =>
        p.id === id
          ? { ...p, status: "running", startedAt: Date.now() }
          : p
      ),
    })),

  setPhaseStatus: (id, status, durationMs) =>
    set((s) => ({
      phases: s.phases.map((p) =>
        p.id === id ? { ...p, status, durationMs: durationMs ?? p.durationMs } : p
      ),
    })),

  showPermission: (request) =>
    set({ pendingPermission: request }),

  clearPermission: () =>
    set({ pendingPermission: null }),

  setActiveTool: (toolName) =>
    set({ activeTool: toolName }),

  appendExploreResult: (data) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: makeId(),
          role: "explore" as const,
          content: "",
          isStreaming: false,
          exploreResult: data,
        },
      ],
    })),
}));
