import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePipelineStore, type ChatMessage } from "@renderer/store/pipeline.store";
import { useConfigStore } from "@renderer/store/config.store";
import PermissionPrompt from "./PermissionPrompt";

// --- Individual message bubble ---
function MessageBubble({ msg }: { msg: ChatMessage }): React.JSX.Element {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5">
          ◈
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "order-1" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-brand-600 text-white rounded-tr-sm"
              : "bg-slate-700 text-slate-100 rounded-tl-sm"
          }`}
        >
          {msg.content ? (
            <pre className="whitespace-pre-wrap break-words font-sans m-0">
              {msg.content}
            </pre>
          ) : (
            /* Streaming placeholder — three pulsing dots */
            <span className="flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          )}

          {/* Blinking cursor while streaming */}
          {msg.isStreaming && msg.content && (
            <span className="inline-block w-0.5 h-3.5 bg-brand-400 ml-0.5 align-middle animate-pulse" />
          )}
        </div>
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-slate-200 text-xs font-bold ml-2 mt-0.5">
          U
        </div>
      )}
    </div>
  );
}

// --- Chat input bar ---
function ChatInput(): React.JSX.Element {
  const { status, startRun, pendingPermission } = usePipelineStore();
  const { claudeAuth, apiKey, selectedPreset } = useConfigStore();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRunning = status === "running";
  const isWaitingPermission = pendingPermission !== null;
  const hasClaudeCode = claudeAuth?.loggedIn === true;
  const canRun = hasClaudeCode || Boolean(apiKey);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || isRunning || !canRun) return;

    const runMode: "claude-code" | "api-key" = hasClaudeCode ? "claude-code" : "api-key";
    startRun(msg);
    setInput("");

    const { skipPermissions } = useConfigStore.getState();
    await window.specwright.pipeline.start({
      systemPromptPath: selectedPreset || undefined,
      systemPrompt: selectedPreset
        ? undefined
        : "You are a helpful AI assistant.",
      userMessage: msg,
      mode: runMode,
      skipPermissions,
    });
  }, [input, isRunning, canRun, hasClaudeCode, selectedPreset, startRun]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleAbort = () => {
    window.specwright.pipeline.abort();
  };

  return (
    <div className="border-t border-slate-700 bg-slate-800/80 px-4 py-3">
      {!canRun && (
        <p className="text-amber-400 text-xs mb-2">
          Add an API key or log in with Claude Code to start chatting.
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning || !canRun}
          placeholder={
            isWaitingPermission
              ? "Waiting for permission response…"
              : !canRun
                ? "Configure API key or Claude Code auth in the left panel…"
                : "Message Specwright… (Enter to send, Shift+Enter for newline)"
          }
          rows={1}
          className="flex-1 min-w-0 bg-slate-700 text-slate-100 text-sm rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-brand-500 resize-none placeholder-slate-500 disabled:opacity-40 scrollable"
          style={{ maxHeight: "160px", overflowY: "auto" }}
        />

        {isRunning ? (
          <button
            onClick={handleAbort}
            className="flex-shrink-0 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
          >
            ■ Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() || !canRun}
            className="flex-shrink-0 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
          >
            ▶ Send
          </button>
        )}
      </div>
      <p className="text-slate-600 text-xs mt-1.5">
        {hasClaudeCode ? "Using Claude Code CLI" : "Using API key"} · Shift+Enter for new line
      </p>
    </div>
  );
}

// --- Main ChatPanel ---
export default function ChatPanel(): React.JSX.Element {
  const { messages, status, clearFeed, pendingPermission } = usePipelineStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages or permission changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingPermission]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-slate-700 bg-slate-900/40 flex-shrink-0">
        {messages.length > 0 && (
          <button
            onClick={clearFeed}
            disabled={status === "running"}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-30 text-xs transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollable px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
            <span className="text-5xl">◈</span>
            <p className="text-sm text-center">
              Start a conversation.<br />
              <span className="text-xs">Specwright will answer in this panel.</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* Permission prompt — shown inline in the chat flow */}
        <PermissionPrompt />

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <ChatInput />
    </div>
  );
}
