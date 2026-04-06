import React, { useState } from "react";
import { usePipelineStore } from "@renderer/store/pipeline.store";

/** Tool icon based on tool name */
function ToolIcon({ toolName }: { toolName: string }): React.JSX.Element {
  const icons: Record<string, string> = {
    Bash: "⚡",
    Write: "📝",
    Edit: "✏️",
    Read: "📖",
    Glob: "🔍",
    Grep: "🔎",
    Agent: "🤖",
  };
  return <span className="text-lg">{icons[toolName] ?? "🔧"}</span>;
}

/** Severity color based on tool type */
function getSeverityColor(toolName: string): string {
  // Destructive or write operations get amber/orange
  if (["Bash", "Write"].includes(toolName)) return "border-amber-500/60 bg-amber-950/30";
  // Edit is moderate
  if (toolName === "Edit") return "border-yellow-500/50 bg-yellow-950/20";
  // Read-only operations are green/safe
  return "border-brand-500/40 bg-brand-950/20";
}

export default function PermissionPrompt(): React.JSX.Element | null {
  const { pendingPermission, clearPermission } = usePipelineStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!pendingPermission) return null;

  const { id, toolName, toolInput, description } = pendingPermission;
  const severityClass = getSeverityColor(toolName);

  const handleAllow = (): void => {
    window.specwright.pipeline.respondPermission(id, true);
    clearPermission();
  };

  const handleDeny = (): void => {
    window.specwright.pipeline.respondPermission(id, false);
    clearPermission();
  };

  // Format tool input for display
  const inputPreview = toolName === "Bash"
    ? (toolInput.command as string) ?? ""
    : toolName === "Write" || toolName === "Edit" || toolName === "Read"
      ? (toolInput.file_path as string) ?? ""
      : JSON.stringify(toolInput, null, 2);

  return (
    <div className={`mx-4 mb-3 rounded-xl border-2 ${severityClass} p-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <ToolIcon toolName={toolName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-semibold">Permission Required</span>
            <span className="text-slate-400 text-xs px-2 py-0.5 bg-slate-700/60 rounded-full">
              {toolName}
            </span>
          </div>
          <p className="text-slate-300 text-sm">{description}</p>
        </div>
      </div>

      {/* Tool input preview */}
      {inputPreview && (
        <div className="mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 text-xs hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <span className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
            {isExpanded ? "Hide details" : "Show details"}
          </button>
          {isExpanded && (
            <pre className="mt-2 bg-slate-900/80 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono overflow-x-auto max-h-48 scrollable">
              {inputPreview}
            </pre>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleAllow}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <span>✓</span> Allow
        </button>
        <button
          onClick={handleDeny}
          className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <span>✕</span> Deny
        </button>
        <span className="text-slate-600 text-xs ml-auto">
          Claude is waiting for your approval
        </span>
      </div>
    </div>
  );
}
