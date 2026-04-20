import React, { useEffect, useRef, useState, useCallback } from "react";
import WelcomeScreen from "./WelcomeScreen";
import InstructionsBuilder from "./InstructionsBuilder";
import HealerPanel from "./HealerPanel";
import { AgentOutputPanel } from "./AgentOutputPanel";
import { RunTestsPalette } from "./RunTestsPalette";
import { usePipelineStore } from "@renderer/store/pipeline.store";
import { useConfigStore } from "@renderer/store/config.store";
import { useReportAvailability } from "@renderer/hooks/useReportAvailability";
import { detectPhaseFromTool, detectPhaseFromText } from "@renderer/hooks/usePhaseDetection";

export default function CenterPanel(): React.JSX.Element {
  const { appendToken, appendLog, finishRun, setError, setActivePhase, setPhaseStatus, splitForPhase, status, setMcpStatus } = usePipelineStore();
  const { projectState, loaded, hydrate, activeTab, setActiveTab, projectPath } = useConfigStore();
  const lastPhaseRef = React.useRef<number>(0);
  const runId = usePipelineStore((s) => s.runId);

  // Reset per-run phase tracking on every fresh run
  useEffect(() => {
    lastPhaseRef.current = 0;
  }, [runId]);

  // ── Run Tests picker state ───────────────────────────────────────────────────
  const [showRunPicker, setShowRunPicker] = useState(false);
  const [testScripts, setTestScripts] = useState<Record<string, string>>({});
  const [featureModules, setFeatureModules] = useState<{ modules: string[]; workflows: string[] }>({ modules: [], workflows: [] });
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectPath) return;
    window.specwright.project.readFeatureModules(projectPath).then(setFeatureModules);
  }, [projectPath]);

  const hasTests = featureModules.modules.length > 0 || featureModules.workflows.length > 0;

  // ── Reports ──────────────────────────────────────────────────────────────────
  const { reportAvailability, showReportMenu, setShowReportMenu, reportMenuRef, checkReportAvailability } = useReportAvailability();

  const openRunPicker = useCallback(async () => {
    if (projectPath) {
      const [scripts, modules] = await Promise.all([
        window.specwright.project.readTestScripts(projectPath),
        window.specwright.project.readFeatureModules(projectPath),
      ]);
      setTestScripts(scripts);
      setFeatureModules(modules);
    }
    setShowRunPicker(true);
    setTimeout(() => customInputRef.current?.focus(), 80);
  }, [projectPath]);

  const closeRunPicker = useCallback(() => {
    setShowRunPicker(false);
  }, []);

  const handleRunTests = useCallback(async (arg: string) => {
    closeRunPicker();
    const { resumeRun } = usePipelineStore.getState();
    const userMessage = `/e2e-run ${arg}`.trim();
    resumeRun(userMessage);
    const { skipPermissions } = useConfigStore.getState();
    await window.specwright.pipeline.start({ userMessage, mode: "claude-code", skipPermissions });
  }, [closeRunPicker]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { showPermission } = usePipelineStore();

  const advanceToPhase = useCallback((phaseId: number) => {
    if (!phaseId || phaseId === lastPhaseRef.current) return;
    if (phaseId < lastPhaseRef.current) return;

    if (lastPhaseRef.current > 0) {
      setPhaseStatus(lastPhaseRef.current, "done");
    }

    for (let i = lastPhaseRef.current + 1; i < phaseId; i++) {
      setPhaseStatus(i, "done");
    }

    setActivePhase(phaseId);
    splitForPhase(phaseId);
    lastPhaseRef.current = phaseId;
  }, [setActivePhase, setPhaseStatus, splitForPhase]);

  const handleToken = useCallback((token: string) => {
    appendToken(token);

    for (let i = 0; i < 10; i++) {
      const { messages } = usePipelineStore.getState();
      const lastMsg = messages[messages.length - 1];
      if (!(lastMsg?.role === "assistant" && lastMsg.content)) break;

      const detected = detectPhaseFromText(lastMsg.content.slice(-2000), lastPhaseRef.current);
      if (!detected || detected <= lastPhaseRef.current) break;
      advanceToPhase(detected);
    }
  }, [appendToken, advanceToPhase]);

  // Wire IPC events
  useEffect(() => {
    const offToken = window.specwright.pipeline.onToken(({ token }) => handleToken(token));
    const offDone  = window.specwright.pipeline.onDone(({ fullText, sessionId, userMessage }) => {
      if (lastPhaseRef.current > 0) {
        setPhaseStatus(lastPhaseRef.current, "done");
      }
      finishRun(fullText, sessionId, userMessage);
      checkReportAvailability();
    });
    const offError = window.specwright.pipeline.onError(({ error }) => setError(error));
    const offLog   = window.specwright.pipeline.onLog(({ line }) => {
      appendLog(line);

      if (line.startsWith("[tool]")) {
        if (lastPhaseRef.current === 0) advanceToPhase(1);

        if (line.startsWith("[tool] Skill:")) {
          const skillName = line.replace("[tool] Skill:", "").trim();
          const phase = detectPhaseFromTool("Skill", skillName);
          if (phase) advanceToPhase(phase);
        }

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
    const offToolStart = window.specwright.pipeline.onToolStart(({ toolName }) => {
      if (toolName === "Skill" || toolName === "Agent") {
        // detail handled via log line
      }
      if (lastPhaseRef.current === 0) advanceToPhase(1);
    });
    const offToolEnd = window.specwright.pipeline.onToolEnd(() => {});
    const offMcpStatus = window.specwright.pipeline.onMcpStatus(({ server, status: mcpSt }) => {
      setMcpStatus(server, mcpSt);
    });
    return () => {
      offToken(); offDone(); offError(); offLog();
      offPerm(); offToolStart(); offToolEnd(); offMcpStatus();
    };
  }, [handleToken, appendLog, finishRun, setError, setPhaseStatus, showPermission, advanceToPhase, setMcpStatus, checkReportAvailability]);

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

  const showOutput = status === "running" || status === "done" || status === "error";
  const hasReports = reportAvailability.playwright || reportAvailability.bdd;

  const reportDropdown = (
    <div className="relative" ref={reportMenuRef}>
      <button
        onClick={() => setShowReportMenu((v) => !v)}
        className="text-slate-400 hover:text-slate-200 text-xs border border-slate-700 hover:border-slate-500 rounded px-2.5 py-1 transition-colors flex items-center gap-1.5"
      >
        <span>📊</span> Reports <span className="opacity-60">▾</span>
      </button>
      {showReportMenu && (
        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 min-w-[170px] py-1">
          <button
            disabled={!reportAvailability.playwright}
            onClick={() => { setShowReportMenu(false); window.specwright.report.openPlaywright(projectPath!); }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <span>🎭</span> Playwright Report
          </button>
          <button
            disabled={!reportAvailability.bdd}
            onClick={() => { setShowReportMenu(false); window.specwright.report.openBdd(projectPath!); }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <span>🥒</span> BDD Report
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar — shown when pipeline is NOT running */}
      {!showOutput && (
        <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900/60 px-4 flex items-center justify-between">
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
          <div className="flex items-center gap-4">
            {hasTests && (
              <button
                onClick={openRunPicker}
                className="text-emerald-400 hover:text-emerald-300 text-xs border border-emerald-800 hover:border-emerald-600 rounded px-2.5 py-1 transition-colors flex items-center gap-1.5"
              >
                <span>▶</span> Run Tests
              </button>
            )}
            {hasReports && reportDropdown}
          </div>
        </div>
      )}

      {/* Reports bar — shown after run completes */}
      {showOutput && status === "done" && hasReports && (
        <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900/60 px-4 py-1.5 flex items-center justify-end">
          {reportDropdown}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {showOutput ? (
          <AgentOutputPanel onOpenRunPicker={openRunPicker} />
        ) : activeTab === "healer" ? (
          <HealerPanel />
        ) : (
          <InstructionsBuilder />
        )}
      </div>

      {showRunPicker && (
        <RunTestsPalette
          testScripts={testScripts}
          featureModules={featureModules}
          onRun={handleRunTests}
          onClose={closeRunPicker}
          inputRef={customInputRef}
        />
      )}
    </div>
  );
}
