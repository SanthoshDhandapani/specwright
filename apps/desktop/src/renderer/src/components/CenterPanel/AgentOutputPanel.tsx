import React, { useEffect, useRef, useState, useCallback, useReducer } from "react";
import PermissionPrompt from "./PermissionPrompt";
import { PhaseHeader } from "./PhaseHeader";
import { usePipelineStore, type ChatMessage } from "@renderer/store/pipeline.store";
import { useConfigStore } from "@renderer/store/config.store";

// ── Phase grouping ─────────────────────────────────────────────────────────────
interface PhaseGroup {
  phaseId: number | undefined;
  messages: ChatMessage[];
}

function groupMessagesByPhase(messages: ChatMessage[]): PhaseGroup[] {
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

// ── URL-aware text renderer ────────────────────────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s)>\]'"\\]+/g;

function renderWithLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href="#"
        onClick={(e) => { e.preventDefault(); window.specwright.shell.openUrl(url); }}
        className="text-brand-400 hover:text-brand-300 underline decoration-brand-700 hover:decoration-brand-400 cursor-pointer transition-colors"
        title={`Open ${url}`}
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

// ── Agent output panel ────────────────────────────────────────────────────────
export function AgentOutputPanel({ onOpenRunPicker }: { onOpenRunPicker: () => void }): React.JSX.Element {
  const { messages, logLines, status, errorMessage, clearFeed, injectUserMessage, startRun, resumeRun, phases } = usePipelineStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing effect — reveals content at ~500 chars/sec via requestAnimationFrame
  const displayedText = useRef<Map<string, string>>(new Map());
  const [, repaint] = useReducer((x: number) => x + 1, 0);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const CHARS_PER_MS = 0.2;

    const animate = (ts: number) => {
      const elapsed = lastTsRef.current ? ts - lastTsRef.current : 16;
      lastTsRef.current = ts;
      const charsToReveal = Math.max(1, Math.round(elapsed * CHARS_PER_MS));

      const msgs = usePipelineStore.getState().messages;
      let changed = false;
      for (const msg of msgs) {
        if (msg.role !== "assistant") continue;
        const shown = displayedText.current.get(msg.id) ?? "";
        if (shown.length < msg.content.length) {
          const next = msg.isStreaming
            ? msg.content.slice(0, shown.length + charsToReveal)
            : msg.content;
          displayedText.current.set(msg.id, next);
          changed = true;
        }
      }
      if (changed) repaint();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const isRunning = status === "running";

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
      const delivered = await window.specwright.pipeline.sendMessage(text);
      if (delivered) {
        injectUserMessage(text);
        return;
      }
    }
    {
      const { startRun, resumeRun, lastSessionId, hookPassphrase, status: pipelineStatus, phases } = usePipelineStore.getState();
      const { skipPermissions } = useConfigStore.getState();
      const hasProgress = phases.some(p => p.status === "done" || p.status === "running");
      const isResuming = pipelineStatus !== "idle" && hasProgress;

      const messageForHook = hookPassphrase && text !== hookPassphrase
        ? `${hookPassphrase}: ${text}`
        : text;

      if (lastSessionId && isResuming) {
        resumeRun(text);
        await window.specwright.pipeline.start({
          userMessage: messageForHook,
          skipPermissions,
          resumeSessionId: lastSessionId,
        });
      } else if (isResuming) {
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
                onClick={onOpenRunPicker}
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

            return (
              <div key={msg.id} className="group/msg relative">
                {msg.content ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-slate-200 text-sm leading-relaxed m-0 select-text cursor-text">
                    {renderWithLinks(displayedText.current.get(msg.id) ?? msg.content)}
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

          if (phase) {
            return (
              <div
                key={`phase-group-${group.phaseId}-${groupIdx}`}
                className={`rounded-xl border overflow-hidden ${
                  isActivePhase ? "border-brand-700/50" : "border-slate-700/60"
                }`}
              >
                <PhaseHeader phase={phase} isActive={isActivePhase} />
                {group.messages.some((m) => m.content || m.isStreaming) && (
                  <div className="px-5 py-4 space-y-3 bg-slate-800/40">
                    {messageBubbles}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={`unphased-${groupIdx}`} className="space-y-3">
              {messageBubbles}
            </div>
          );
        })}

        <PermissionPrompt />
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
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
    </div>
  );
}
