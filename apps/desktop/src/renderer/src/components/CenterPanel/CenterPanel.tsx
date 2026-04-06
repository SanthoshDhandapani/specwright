import React, { useEffect, useRef, useState, useCallback } from "react";
// import PipelineStepper from "./PipelineStepper"; // parked — phase detection needs rework
import WelcomeScreen from "./WelcomeScreen";
import InstructionsBuilder from "./InstructionsBuilder";
import PermissionPrompt from "./PermissionPrompt";
import { usePipelineStore, type ChatMessage } from "@renderer/store/pipeline.store";
import { useConfigStore } from "@renderer/store/config.store";

// ── Streaming output panel (shown while pipeline runs / after done) ──────────
function AgentOutputPanel(): React.JSX.Element {
  const { messages, logLines, status, errorMessage, clearFeed, injectUserMessage } = usePipelineStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState<string | null>(null); // message id that was copied

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isRunning = status === "running";

  // Find the most recent active tool from log lines
  const activeTool = (() => {
    for (let i = logLines.length - 1; i >= 0; i--) {
      const line = logLines[i];
      if (line.startsWith("[tool]") && line.includes("— started")) {
        const name = line.replace("[tool]", "").replace("— started", "").trim();
        const completedLater = logLines.slice(i + 1).some(
          (l) => l.startsWith("[tool]") && l.includes(name) && l.includes("— done")
        );
        if (!completedLater) return name;
      }
    }
    return null;
  })();

  const handleCopy = useCallback((id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    inputRef.current?.focus();
    injectUserMessage(text);

    if (isRunning) {
      // Pipeline active — inject message into current session
      window.specwright.pipeline.sendMessage(text);
    } else {
      // Pipeline finished (approval checkpoint or completion).
      // Start a continuation run with FULL context snapshot — no re-reading needed.
      const { startRun, phases, messages } = usePipelineStore.getState();

      // Read context files from disk (plan + seed + conventions)
      const ctx = await window.specwright.pipeline.readContextFiles();

      // Build dynamic phase context
      const completedPhases = phases
        .filter(p => p.status === "done")
        .map(p => `${p.id}. ${p.label}`)
        .join(", ");
      const nextPhase = phases.find(p => p.status === "pending");

      // Get last assistant output (contains scenarios, selectors, phase summaries)
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant" && m.content);
      const sessionOutput = lastAssistantMsg?.content.slice(-3000) ?? "";

      const continuationPrompt = [
        `User response: ${text}`,
        ``,
        completedPhases ? `Completed phases: ${completedPhases}` : ``,
        nextPhase ? `Next phase to execute: ${nextPhase.id}. ${nextPhase.label}` : `Continue with remaining phases.`,
        ``,
        `## CONTEXT FROM PREVIOUS SESSION (DO NOT re-read these files — all content is below)`,
        ``,
        ctx.plan ? `### Test Plan\n\`\`\`\n${ctx.plan}\n\`\`\`\n` : ``,
        ctx.seed ? `### Seed File (Validated Selectors)\n\`\`\`javascript\n${ctx.seed}\n\`\`\`\n` : ``,
        `### Agent Instructions (code-generator + bdd-generator + testConfig)`,
        `The following contains COMPLETE coding conventions, FIELD_TYPES reference, processDataTable patterns,`,
        `feature file format, step definition structure, import paths, and testConfig routes.`,
        `You do NOT need to read fixtures.js, stepHelpers.js, testConfig.js, global-hooks.js, or any shared steps.`,
        ``,
        ctx.conventions,
        ``,
        `### Previous Session Output (last 3000 chars)`,
        sessionOutput,
        ``,
        `## CRITICAL INSTRUCTIONS`,
        `- You have ALL the context above including complete agent instructions, test plan, seed file, and testConfig.`,
        `- Do NOT use Read tool on: fixtures.js, stepHelpers.js, testConfig.js, global-hooks.js, navigation.steps.js, common.steps.js, auth.steps.js`,
        `- Do NOT use Glob to scan existing features or steps — you have the plan and conventions already.`,
        `- Go DIRECTLY to file creation: mkdir directories then Write the .feature and steps.js files.`,
        `- Use the code-generator and bdd-generator instructions above for exact patterns.`,
      ].filter(Boolean).join("\n");

      startRun(text);
      const { skipPermissions } = useConfigStore.getState();
      await window.specwright.pipeline.start({
        userMessage: continuationPrompt,
        skipPermissions,
      });
    }
  }, [inputText, isRunning, injectUserMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-900/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          {isRunning && !activeTool && (
            <>
              <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
              <span className="text-brand-400 text-xs">Agent running…</span>
            </>
          )}
          {isRunning && activeTool && (
            <>
              <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-yellow-300 text-xs font-mono">{activeTool}</span>
              <span className="text-slate-500 text-xs">running…</span>
            </>
          )}
          {status === "done" && <span className="text-green-400 text-xs">✓ Complete</span>}
          {status === "error" && <span className="text-red-400 text-xs">✕ {errorMessage ?? "Error"}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <button
                onClick={() => window.specwright.pipeline.interrupt()}
                className="text-amber-400 hover:text-amber-300 text-xs border border-amber-800 hover:border-amber-600 rounded px-2 py-0.5 transition-colors"
                title="Pause Claude — stops current turn, you can type new instructions"
              >
                ⏸ Interrupt
              </button>
              <button
                onClick={() => window.specwright.pipeline.abort()}
                className="text-red-400 hover:text-red-300 text-xs border border-red-800 hover:border-red-600 rounded px-2 py-0.5 transition-colors"
                title="Kill the session completely"
              >
                ■ Abort
              </button>
            </>
          )}
          {!isRunning && (
            <button
              onClick={clearFeed}
              className="text-slate-400 hover:text-white text-xs border border-slate-700 hover:border-slate-500 rounded px-2 py-0.5 transition-colors"
            >
              ← Back to Instructions
            </button>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollable px-4 py-4 space-y-4">
        {isRunning && messages.length === 0 && (
          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Establishing session… (may take 15–20s with a large system prompt)
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            // Skip the very first user message (it's the instructions JSON — too noisy to show)
            if (messages.indexOf(msg) === 0) return null;
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-brand-900/40 border border-brand-700/50 rounded-xl px-4 py-2.5 max-w-[85%]">
                  <p className="text-brand-200 text-sm whitespace-pre-wrap select-text cursor-text">{msg.content}</p>
                </div>
              </div>
            );
          }

          // Assistant message
          return (
            <div key={msg.id} className="group relative">
              <div className="bg-slate-800 rounded-xl px-5 py-4 border border-slate-700">
                {msg.content ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-slate-200 text-sm leading-relaxed m-0 select-text cursor-text">
                    {msg.content}
                  </pre>
                ) : (
                  <span className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
                {msg.isStreaming && msg.content && !activeTool && (
                  <span className="inline-block w-0.5 h-4 bg-brand-400 ml-0.5 align-middle animate-pulse" />
                )}
                {msg.isStreaming && activeTool && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                    <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-yellow-300 text-xs font-mono">{activeTool}</span>
                    <span className="text-slate-500 text-xs">running…</span>
                  </div>
                )}
              </div>
              {/* Copy button — appears on hover */}
              {msg.content && (
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white text-xs border border-slate-700 hover:border-slate-500 rounded px-1.5 py-0.5 bg-slate-900 transition-all"
                >
                  {copied === msg.id ? "✓" : "Copy"}
                </button>
              )}
            </div>
          );
        })}

        {/* Permission prompt — shown inline at the bottom of the message thread */}
        <PermissionPrompt />

        <div ref={bottomRef} />
      </div>

      {/* Input bar — always visible when output panel is shown */}
      {(
        <div className="flex-shrink-0 border-t border-slate-700 px-4 py-3 bg-slate-900/60">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message to guide the agent… (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="flex-1 resize-none bg-slate-800 border border-slate-600 focus:border-brand-500 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-600 outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="flex-shrink-0 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg px-3 py-2 transition-colors h-[60px]"
            >
              Send
            </button>
          </div>
          <p className="text-slate-700 text-xs mt-1">
            The agent will receive your message and can respond or adjust its approach.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main CenterPanel ──────────────────────────────────────────────────────────
/**
 * Phase detection via TOOL EVENTS — maps Skill/Agent tool names to pipeline phases.
 * This is the primary detection method (structural, reliable).
 * Falls back to text pattern matching only for phases without distinct tool calls.
 */
const TOOL_TO_PHASE: Record<string, number> = {
  // Skill invocations (when skills are registered)
  "e2e-process": 3,
  "e2e-plan": 4,     // also covers Phase 5 (exploration)
  "e2e-validate": 5,
  "e2e-generate": 7,
  "e2e-heal": 8,     // also covers Phase 9

  // Agent invocations (when executed directly)
  "input-processor": 3,
  "jira-processor": 3,
  "playwright-test-planner": 4,
  "playwright-test-generator": 7,
  "bdd-generator": 7,
  "code-generator": 8,
  "execution-manager": 9,
  "playwright-test-healer": 9,
  "_review-agent": 10,
};

/** Map a tool name (from Skill or Agent call) to a phase ID */
function detectPhaseFromTool(toolName: string, toolDetail: string): number | null {
  // Check if this is a Skill tool call — detail has the skill name
  if (toolName === "Skill" && toolDetail) {
    const skillName = toolDetail.replace(/^\//, ""); // remove leading /
    if (TOOL_TO_PHASE[skillName] !== undefined) return TOOL_TO_PHASE[skillName];
  }

  // Check if this is an Agent tool call — detail has the agent description
  if (toolName === "Agent" && toolDetail) {
    for (const [agentKey, phaseId] of Object.entries(TOOL_TO_PHASE)) {
      if (toolDetail.toLowerCase().includes(agentKey.toLowerCase())) return phaseId;
    }
  }

  return null;
}

/**
 * Text-based phase detection — matches Claude's ACTIVE phase headers only.
 *
 * Active headers look like:
 *   "### Phase 3: /e2e-process — Complete"
 *   "## Phase 6: USER APPROVAL CHECKPOINT"
 *   "Now invoking **Phase 3: `/e2e-process`**"
 *
 * Listing lines look like (must NOT match):
 *   "- 🔄 Phase 3: Input Processing (`/e2e-process`)"
 *   "- ⬜ Phase 4: Exploration & Planning"
 *
 * Key difference: listing lines start with "- " (bullet), active headers don't.
 */
function detectPhaseFromText(text: string, currentPhase: number): number | null {
  const next = currentPhase + 1;
  if (next > 10) return null;

  // Only check the LAST LINE of streamed text — not a tail window
  const lines = text.split("\n").filter(l => l.trim());
  const lastLine = (lines[lines.length - 1] ?? "").trim();

  // Skip if last line is a listing bullet (starts with "- ")
  if (lastLine.startsWith("- ")) return null;

  // Match "Phase N" in active headers only (###, ##, **, "Now invoking", or standalone)
  const phaseRegex = new RegExp(`Phase\\s+${next}\\b`, "i");
  if (phaseRegex.test(lastLine)) return next;

  return null;
}

export default function CenterPanel(): React.JSX.Element {
  const { appendToken, appendLog, finishRun, setError, setActivePhase, setPhaseStatus, status } = usePipelineStore();
  const { projectState, loaded, hydrate } = useConfigStore();
  const lastPhaseRef = React.useRef<number>(0);

  // Load config on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { showPermission } = usePipelineStore();

  // Helper: advance stepper to a phase (with sequential guard + gap filling)
  const advanceToPhase = useCallback((phaseId: number) => {
    if (!phaseId || phaseId === lastPhaseRef.current) return;
    // Only advance forward, never backward
    if (phaseId < lastPhaseRef.current) return;
    // Allow skipping at most 3 phases (e.g., 3→6 OK, 3→10 not)
    if (phaseId - lastPhaseRef.current > 3 && lastPhaseRef.current > 0) return;

    // Fill gaps: mark any skipped phases between current and target as "done"
    // (e.g., jumping from Phase 1 → Phase 3 auto-completes Phase 2)
    for (let i = lastPhaseRef.current + 1; i < phaseId; i++) {
      setPhaseStatus(i, "done");
    }

    if (lastPhaseRef.current > 0) {
      setPhaseStatus(lastPhaseRef.current, "done");
    }
    setActivePhase(phaseId);
    lastPhaseRef.current = phaseId;
  }, [setActivePhase, setPhaseStatus]);

  // Detect phase from streamed tokens (text fallback for phases without tool calls)
  const handleToken = useCallback((token: string) => {
    appendToken(token);

    const { messages } = usePipelineStore.getState();
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content) {
      const detected = detectPhaseFromText(lastMsg.content.slice(-300), lastPhaseRef.current);
      if (detected) advanceToPhase(detected);
    }
  }, [appendToken, advanceToPhase]);

  // Wire IPC events once on mount
  useEffect(() => {
    const offToken = window.specwright.pipeline.onToken(({ token }) => handleToken(token));
    const offDone  = window.specwright.pipeline.onDone(({ fullText }) => {
      if (lastPhaseRef.current > 0) {
        setPhaseStatus(lastPhaseRef.current, "done");
      }
      finishRun(fullText);
    });
    const offError = window.specwright.pipeline.onError(({ error }) => setError(error));
    const offLog   = window.specwright.pipeline.onLog(({ line }) => {
      appendLog(line);

      // Tool-based phase detection (supplements text detection)
      if (line.startsWith("[tool]")) {
        // First tool call → Phase 1
        if (lastPhaseRef.current === 0) advanceToPhase(1);

        // Skill invocations (when skills are registered)
        if (line.startsWith("[tool] Skill:")) {
          const skillName = line.replace("[tool] Skill:", "").trim();
          const phase = detectPhaseFromTool("Skill", skillName);
          if (phase) advanceToPhase(phase);
        }

        // Agent invocations
        if (line.startsWith("[tool] Agent:")) {
          const agentDetail = line.replace("[tool] Agent:", "").trim();
          const phase = detectPhaseFromTool("Agent", agentDetail);
          if (phase) advanceToPhase(phase);
        }
      }
    });
    const offPerm  = window.specwright.pipeline.onPermissionRequest((request) => {
      showPermission({ ...request, timestamp: Date.now() });
    });

    // Wire tool start/end events for phase detection
    const offToolStart = window.specwright.pipeline.onToolStart(({ toolName }) => {
      // Skill and Agent tool calls are the most reliable phase indicators
      if (toolName === "Skill" || toolName === "Agent") {
        // The detail comes via the log line — handled above
      }
      // First tool call = Phase 1 has started
      if (lastPhaseRef.current === 0) advanceToPhase(1);
    });
    const offToolEnd = window.specwright.pipeline.onToolEnd(() => {
      // No phase transition on tool end — phases end when the next one starts
    });

    return () => {
      offToken();
      offDone();
      offError();
      offLog();
      offPerm();
      offToolStart();
      offToolEnd();
    };
  }, [handleToken, appendLog, finishRun, setError, setPhaseStatus, showPermission, advanceToPhase]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (projectState === "none" || projectState === "bootstrapping" || projectState === "error") {
    return <WelcomeScreen />;
  }

  // When pipeline is running or just finished — show agent output
  const showOutput = status === "running" || status === "done" || status === "error";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Pipeline stepper — parked for now, phase detection needs rework
      {showOutput && (
        <div className="flex-shrink-0 border-b border-slate-700">
          <PipelineStepper />
        </div>
      )}
      */}

      {/* Main content: instructions builder OR agent output */}
      <div className="flex-1 min-h-0 flex flex-col">
        {showOutput ? <AgentOutputPanel /> : <InstructionsBuilder />}
      </div>
    </div>
  );
}
