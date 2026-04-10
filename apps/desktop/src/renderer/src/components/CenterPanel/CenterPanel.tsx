import React, { useEffect, useRef, useState, useCallback } from "react";
import WelcomeScreen from "./WelcomeScreen";
import InstructionsBuilder from "./InstructionsBuilder";
import HealerPanel from "./HealerPanel";
import PermissionPrompt from "./PermissionPrompt";
import { usePipelineStore, type ChatMessage, type Phase, MAX_PHASE_ID } from "@renderer/store/pipeline.store";
import { useConfigStore } from "@renderer/store/config.store";

// ── Phase grouping ────────────────────────────────────────────────────────────
interface PhaseGroup {
  phaseId: number | undefined;
  messages: ChatMessage[];
}

/**
 * Groups messages into phase buckets.
 * - Assistant messages with a phaseId start a new group when the phaseId changes.
 * - User messages and untagged assistant messages fall into the current group.
 */
function groupMessagesByPhase(messages: ChatMessage[]): PhaseGroup[] {
  // Skip the very first message (the initial instructions blob sent by the user)
  const body = messages.length > 0 && messages[0].role === "user" ? messages.slice(1) : messages;

  const groups: PhaseGroup[] = [];
  for (const msg of body) {
    const lastGroup = groups[groups.length - 1];
    if (msg.role === "assistant" && msg.phaseId !== undefined) {
      if (!lastGroup || msg.phaseId !== lastGroup.phaseId) {
        groups.push({ phaseId: msg.phaseId, messages: [msg] });
      } else {
        lastGroup.messages.push(msg);
      }
    } else {
      if (!lastGroup) {
        groups.push({ phaseId: undefined, messages: [msg] });
      } else {
        lastGroup.messages.push(msg);
      }
    }
  }
  return groups;
}

// ── Phase header card ─────────────────────────────────────────────────────────
function PhaseHeader({ phase, isActive }: { phase: Phase; isActive: boolean }): React.JSX.Element {
  const statusNode = (() => {
    if (phase.status === "done") {
      return <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">✓ Done</span>;
    }
    if (phase.status === "running") {
      return (
        <span className="text-brand-400 text-[11px] font-medium flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 border-[1.5px] border-brand-400 border-t-transparent rounded-full animate-spin" />
          Running
        </span>
      );
    }
    if (phase.status === "error") {
      return <span className="text-red-400 text-[11px] font-medium">✕ Error</span>;
    }
    return null;
  })();

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
      isActive ? "border-brand-700/60 bg-brand-950/30" : "border-slate-700/60 bg-slate-800/60"
    }`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          phase.status === "done"
            ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700/60"
            : phase.status === "running"
            ? "bg-brand-900/60 text-brand-300 border border-brand-600/60"
            : "bg-slate-700/60 text-slate-400 border border-slate-600/40"
        }`}>
          {phase.id}
        </span>
        <span className={`text-sm font-semibold font-mono ${
          phase.status === "running" ? "text-brand-300" : phase.status === "done" ? "text-slate-200" : "text-slate-400"
        }`}>
          {phase.label}
        </span>
      </div>
      {statusNode}
    </div>
  );
}

// ── Streaming output panel (shown while pipeline runs / after done) ──────────
function AgentOutputPanel(): React.JSX.Element {
  const { messages, logLines, status, errorMessage, clearFeed, injectUserMessage, startRun, resumeRun, phases } = usePipelineStore();
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

    if (isRunning) {
      // Pipeline active — try to inject into current session
      const delivered = await window.specwright.pipeline.sendMessage(text);
      if (delivered) {
        injectUserMessage(text);
        return; // message delivered to live session
      }
      // Session already ended (e.g., approval checkpoint) — fall through to resume/continuation
    }
    {
      const { startRun, resumeRun, lastSessionId, hookPassphrase, status: pipelineStatus, phases } = usePipelineStore.getState();
      const { skipPermissions } = useConfigStore.getState();
      // Resume only if there's meaningful progress to preserve — at least one phase started/completed.
      // A hook-blocked run (done but 0 phases) should be treated as idle for a fresh start.
      const hasProgress = phases.some(p => p.status === "done" || p.status === "running");
      const isResuming = pipelineStatus !== "idle" && hasProgress;

      // Prepend hook passphrase to resume messages so managed hooks don't block again
      const messageForHook = hookPassphrase && text !== hookPassphrase
        ? `${hookPassphrase}: ${text}`
        : text;

      if (lastSessionId && isResuming) {
        // Resume the previous session — preserve phases/logs, only add message bubbles
        resumeRun(text);
        await window.specwright.pipeline.start({
          userMessage: messageForHook,
          skipPermissions,
          resumeSessionId: lastSessionId,
        });
      } else if (isResuming) {
        // No session to resume — fresh continuation with context injection, preserve phase UI
        resumeRun(text);
        const { phases, messages } = usePipelineStore.getState();
        const ctx = await window.specwright.pipeline.readContextFiles();
        const completedPhases = phases
          .filter(p => p.status === "done")
          .map(p => `${p.id}. ${p.label}`)
          .join(", ");
        const nextPhase = phases.find(p => p.status === "pending");
        const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant" && m.content);
        const sessionOutput = lastAssistantMsg?.content.slice(-3000) ?? "";

        const continuationPrompt = [
          hookPassphrase ? `${hookPassphrase}: User response: ${text}` : `User response: ${text}`,
          ``,
          completedPhases ? `Completed phases: ${completedPhases}` : ``,
          nextPhase ? `Next phase to execute: ${nextPhase.id}. ${nextPhase.label}` : `Continue with remaining phases.`,
          ``,
          `## CONTEXT FROM PREVIOUS SESSION`,
          ctx.plan ? `### Test Plan\n\`\`\`\n${ctx.plan}\n\`\`\`\n` : ``,
          ctx.seed ? `### Seed File\n\`\`\`javascript\n${ctx.seed}\n\`\`\`\n` : ``,
          ctx.conventions,
          `### Previous Session Output (last 3000 chars)`,
          sessionOutput,
        ].filter(Boolean).join("\n");

        await window.specwright.pipeline.start({
          userMessage: continuationPrompt,
          skipPermissions,
        });
      } else {
        // Fresh start — reset everything
        startRun(text);
        await window.specwright.pipeline.start({
          userMessage: messageForHook,
          skipPermissions,
        });
      }
    }
  }, [inputText, isRunning, injectUserMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleRunTests = useCallback(async () => {
    // Use /e2e-run skill directly — no ### Phase N: headers in output, preserves existing phase states
    const userMessage = `/e2e-run --project setup --project main-e2e`;
    resumeRun(userMessage);
    const { skipPermissions } = useConfigStore.getState();
    await window.specwright.pipeline.start({
      userMessage,
      mode: "claude-code",
      skipPermissions,
    });
  }, [resumeRun]);

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
            <>
              <button
                onClick={handleRunTests}
                className="text-emerald-400 hover:text-emerald-300 text-xs border border-emerald-800 hover:border-emerald-600 rounded px-2 py-0.5 transition-colors"
              >
                ▶ Run Tests
              </button>
              <button
                onClick={clearFeed}
                className="text-slate-400 hover:text-white text-xs border border-slate-700 hover:border-slate-500 rounded px-2 py-0.5 transition-colors"
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollable px-4 py-4 space-y-3">
        {isRunning && messages.length === 0 && (
          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Establishing session… (may take 15–20s with a large system prompt)
          </div>
        )}

        {groupMessagesByPhase(messages).map((group, groupIdx) => {
          const phase = group.phaseId ? phases.find((p) => p.id === group.phaseId) ?? null : null;
          const isActivePhase = phase?.status === "running";

          // All messages inside this group, rendered as bubbles
          const messageBubbles = group.messages.map((msg) => {
            if (msg.role === "user") {
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
              <div key={msg.id} className="group/msg relative">
                {msg.content ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-slate-200 text-sm leading-relaxed m-0 select-text cursor-text">
                    {msg.content}
                    {msg.isStreaming && !activeTool && (
                      <span className="inline-block w-0.5 h-4 bg-brand-400 ml-0.5 align-middle animate-pulse" />
                    )}
                  </pre>
                ) : msg.isStreaming ? (
                  <span className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : null}
                {msg.isStreaming && activeTool && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/30">
                    <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-yellow-300 text-xs font-mono">{activeTool}</span>
                    <span className="text-slate-500 text-xs">running…</span>
                  </div>
                )}
                {msg.content && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="absolute top-0 right-0 opacity-0 group-hover/msg:opacity-100 text-slate-500 hover:text-white text-xs border border-slate-700 hover:border-slate-500 rounded px-1.5 py-0.5 bg-slate-900 transition-all"
                  >
                    {copied === msg.id ? "✓" : "Copy"}
                  </button>
                )}
              </div>
            );
          });

          // Phase card — wraps the messages in a bordered card with a header
          if (phase) {
            return (
              <div
                key={`phase-group-${group.phaseId}-${groupIdx}`}
                className={`rounded-xl border overflow-hidden ${
                  isActivePhase ? "border-brand-700/50" : "border-slate-700/60"
                }`}
              >
                <PhaseHeader phase={phase} isActive={isActivePhase} />
                {/* Only render body if there's content */}
                {group.messages.some((m) => m.content || m.isStreaming) && (
                  <div className="px-5 py-4 space-y-3 bg-slate-800/40">
                    {messageBubbles}
                  </div>
                )}
              </div>
            );
          }

          // No phase — render messages bare (pre-phase content or user injects without phase context)
          return (
            <div key={`unphased-${groupIdx}`} className="space-y-3">
              {messageBubbles}
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
 * Text-based phase detection — scans recent streamed content for `### Phase N` headers.
 *
 * The SKILL.md requires agents to output:  ### Phase N: <Label>
 * Using the `###` prefix avoids false positives from bullet lists or the pipeline overview table.
 *
 * Scans for ANY phase N > currentPhase and returns the smallest match.
 * This handles two gap scenarios:
 *   - User Approval pause: Phase 6 is never detected (separate session), so after
 *     resume Phase 7 must be found directly from Phase 5.
 *   - Skipped phases: Phase 8 skipped → Phase 9 found directly from Phase 7.
 * The advanceToPhase helper gap-fills skipped phases as "done" automatically.
 */
function detectPhaseFromText(text: string, currentPhase: number): number | null {
  if (currentPhase >= MAX_PHASE_ID) return null;

  // Find all "### Phase N" headers where N > currentPhase — take the minimum
  const regex = /###\s*Phase\s+(\d+)/gi;
  let match: RegExpExecArray | null;
  let candidate: number | null = null;
  while ((match = regex.exec(text)) !== null) {
    const n = parseInt(match[1], 10);
    if (n > currentPhase && n <= MAX_PHASE_ID) {
      if (candidate === null || n < candidate) candidate = n;
    }
  }
  return candidate;
}

export default function CenterPanel(): React.JSX.Element {
  const { appendToken, appendLog, finishRun, setError, setActivePhase, setPhaseStatus, splitForPhase, status } = usePipelineStore();
  const { projectState, loaded, hydrate, activeTab, setActiveTab } = useConfigStore();
  const lastPhaseRef = React.useRef<number>(0);

  // Load config on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { showPermission } = usePipelineStore();

  // Helper: advance to a phase (forward-only, fills gaps as "done")
  // Also seals the current streaming message and starts a new one tagged with the new phaseId
  const advanceToPhase = useCallback((phaseId: number) => {
    if (!phaseId || phaseId === lastPhaseRef.current) return;
    // Only advance forward, never backward
    if (phaseId < lastPhaseRef.current) return;

    // Mark the current phase as done
    if (lastPhaseRef.current > 0) {
      setPhaseStatus(lastPhaseRef.current, "done");
    }

    // Fill gaps: mark any skipped phases between current and target as "done"
    // (e.g., jumping from Phase 4 → Phase 7 auto-completes 5 and 6)
    for (let i = lastPhaseRef.current + 1; i < phaseId; i++) {
      setPhaseStatus(i, "done");
    }

    setActivePhase(phaseId);
    // Split the streaming output into a new message block for this phase
    splitForPhase(phaseId);
    lastPhaseRef.current = phaseId;
  }, [setActivePhase, setPhaseStatus, splitForPhase]);

  // Detect phase from streamed tokens (text fallback for phases without tool calls)
  const handleToken = useCallback((token: string) => {
    appendToken(token);

    const { messages } = usePipelineStore.getState();
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content) {
      const detected = detectPhaseFromText(lastMsg.content.slice(-600), lastPhaseRef.current);
      if (detected) advanceToPhase(detected);
    }
  }, [appendToken, advanceToPhase]);

  // Wire IPC events once on mount
  useEffect(() => {
    const offToken = window.specwright.pipeline.onToken(({ token }) => handleToken(token));
    const offDone  = window.specwright.pipeline.onDone(({ fullText, sessionId, userMessage }) => {
      // Mark only the last DETECTED phase as done.
      // Do NOT auto-fill future phases — phases that never executed stay "pending".
      // This prevents Run Tests from appearing when the pipeline ended at the
      // User Approval checkpoint without ever reaching BDD Generation.
      if (lastPhaseRef.current > 0) {
        setPhaseStatus(lastPhaseRef.current, "done");
      }

      finishRun(fullText, sessionId, userMessage);
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
      {/* Tab bar — shown when pipeline is NOT running */}
      {!showOutput && (
        <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900/60 px-4">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab("explorer")}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "explorer"
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Explorer
            </button>
            <button
              onClick={() => setActiveTab("healer")}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "healer"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Healer
            </button>
          </div>
        </div>
      )}

      {/* Main content: tab panels OR agent output */}
      <div className="flex-1 min-h-0 flex flex-col">
        {showOutput ? (
          <AgentOutputPanel />
        ) : activeTab === "healer" ? (
          <HealerPanel />
        ) : (
          <InstructionsBuilder />
        )}
      </div>
    </div>
  );
}
