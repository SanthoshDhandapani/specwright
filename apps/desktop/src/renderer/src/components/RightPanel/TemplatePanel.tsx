import React, { useEffect, useState, useCallback, useRef } from "react";
import { useConfigStore } from "@renderer/store/config.store";
import { useInstructionStore, type InstructionCard as ICard } from "@renderer/store/instruction.store";

const RefreshIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
);

interface TemplateEntry {
  templateName: string;
  mode: ICard["mode"];
  moduleName: string;
  category: ICard["category"];
  subModules: string[];
  fileName: string;
  pageURL: string;
  steps: string[];
  filePath: string;
  suitName: string;
  jiraURL: string;
  explore: boolean;
  runExploredCases: boolean;
  runGeneratedCases: boolean;
}

/** Built-in quick-start templates — always available, use BASE_URL from settings */
function getBuiltInTemplates(baseUrl: string): TemplateEntry[] {
  return [
    {
      templateName: "🔍 Quick Explore",
      mode: "explorer",
      moduleName: "HomePage",
      category: "@Modules",
      subModules: [],
      fileName: "homepage",
      pageURL: baseUrl || "http://localhost:5173",
      steps: ["Navigate to the home page and explore all interactive elements"],
      filePath: "",
      suitName: "",
      jiraURL: "",
      explore: true,
      runExploredCases: false,
      runGeneratedCases: false,
    },
    {
      templateName: "🧭 Page Navigation",
      mode: "explorer",
      moduleName: "Navigation",
      category: "@Modules",
      subModules: [],
      fileName: "navigation",
      pageURL: baseUrl || "http://localhost:5173",
      steps: [
        "Navigate to the home page",
        "Verify the page title and main heading",
        "Click each navigation link and verify the URL changes",
        "Verify the active nav item is highlighted",
      ],
      filePath: "",
      suitName: "",
      jiraURL: "",
      explore: true,
      runExploredCases: false,
      runGeneratedCases: false,
    },
    {
      templateName: "📝 Form & CRUD",
      mode: "explorer",
      moduleName: "FormTest",
      category: "@Modules",
      subModules: [],
      fileName: "form_test",
      pageURL: "",
      steps: [
        "Navigate to a page with a form",
        "Fill all required fields with generated data",
        "Submit the form and verify success message",
        "Verify the created item appears in the list",
        "Edit the item and verify changes persist",
        "Delete the item and verify removal",
      ],
      filePath: "",
      suitName: "",
      jiraURL: "",
      explore: true,
      runExploredCases: false,
      runGeneratedCases: false,
    },
    {
      templateName: "🔐 Auth Flow",
      mode: "explorer",
      moduleName: "Authentication",
      category: "@Modules",
      subModules: [],
      fileName: "authentication",
      pageURL: "",
      steps: [
        "Navigate to the sign-in page",
        "Verify sign-in form is displayed",
        "Sign in with valid credentials",
        "Verify user is authenticated (name/avatar visible)",
        "Sign out and verify redirect to sign-in page",
      ],
      filePath: "",
      suitName: "",
      jiraURL: "",
      explore: true,
      runExploredCases: false,
      runGeneratedCases: false,
    },
  ];
}

export default function TemplatePanel(): React.JSX.Element {
  const { projectPath, projectState, envVars } = useConfigStore();
  const { addCard, updateCard, serialize } = useInstructionStore();

  const [exampleTemplates, setExampleTemplates] = useState<TemplateEntry[]>([]);
  const [customTemplates, setCustomTemplates] = useState<TemplateEntry[]>([]);
  const [savingName, setSavingName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const insertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReady = projectState === "ready" && Boolean(projectPath);
  const builtInTemplates = getBuiltInTemplates(envVars.BASE_URL || "");

  // Load project-specific templates when project is ready
  useEffect(() => {
    if (!isReady) return;
    window.specwright.project.readTemplates(projectPath).then((data) => {
      const templates = data as unknown as TemplateEntry[];
      // Filter out generic placeholders like @YourModule
      const meaningful = templates.filter(
        (t) => t.moduleName && !t.moduleName.includes("Your")
      );
      setExampleTemplates(meaningful);
    });
    window.specwright.project.readCustomTemplates(projectPath).then((data) => {
      setCustomTemplates(data as unknown as TemplateEntry[]);
    });
  }, [isReady, projectPath, refreshKey]);

  const handleInsert = useCallback(
    (tmpl: TemplateEntry) => {
      const id = addCard();
      updateCard(id, {
        mode: tmpl.mode || "explorer",
        moduleName: tmpl.moduleName,
        category: tmpl.category,
        subModules: tmpl.subModules || [],
        fileName: tmpl.fileName,
        pageURL: tmpl.pageURL || "",
        steps: tmpl.steps.length > 0 ? tmpl.steps : [""],
        filePath: tmpl.filePath || "",
        suitName: tmpl.suitName || "",
        jiraURL: tmpl.jiraURL || "",
        explore: tmpl.explore,
        runExploredCases: tmpl.runExploredCases,
        runGeneratedCases: tmpl.runGeneratedCases,
      });
      // Brief "Inserted" indicator on the button — auto-clears after 2s
      if (insertTimerRef.current) clearTimeout(insertTimerRef.current);
      setInsertedId(tmpl.templateName);
      insertTimerRef.current = setTimeout(() => setInsertedId(null), 2000);
    },
    [addCard, updateCard]
  );

  const handleSaveAsTemplate = useCallback(async () => {
    if (!savingName.trim() || !projectPath) return;
    const cards = serialize();
    if (cards.length === 0) return;

    const firstCard = cards[0] as Record<string, unknown>;
    const newTemplate: TemplateEntry = {
      templateName: savingName.trim(),
      mode: (firstCard.mode as ICard["mode"]) || "explorer",
      moduleName: (firstCard.moduleName as string) || "",
      category: (firstCard.category as ICard["category"]) || "@Modules",
      subModules: (firstCard.subModules as string[]) || [],
      fileName: (firstCard.fileName as string) || "",
      pageURL: (firstCard.pageURL as string) || "",
      steps: (firstCard.steps as string[]) || [],
      filePath: (firstCard.filePath as string) || "",
      suitName: (firstCard.suitName as string) || "",
      jiraURL: (firstCard.jiraURL as string) || "",
      explore: firstCard.explore === true,
      runExploredCases: firstCard.runExploredCases === true,
      runGeneratedCases: firstCard.runGeneratedCases === true,
    };

    const updated = [...customTemplates, newTemplate];
    await window.specwright.project.writeCustomTemplates(projectPath, updated);
    setCustomTemplates(updated);
    setSavingName("");
    setShowSaveInput(false);
  }, [savingName, projectPath, customTemplates, serialize]);

  const handleDeleteCustom = useCallback(
    async (index: number) => {
      if (!projectPath) return;
      const updated = customTemplates.filter((_, i) => i !== index);
      await window.specwright.project.writeCustomTemplates(projectPath, updated);
      setCustomTemplates(updated);
    },
    [projectPath, customTemplates]
  );

  const renderTemplateCard = (
    tmpl: TemplateEntry,
    key: string,
    onDelete?: () => void
  ): React.JSX.Element => {
    let urlPath = "";
    try { urlPath = tmpl.pageURL ? new URL(tmpl.pageURL).pathname : ""; } catch { /* ignore */ }

    return (
      <div
        key={key}
        className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-brand-400 text-xs">
              {tmpl.category === "@Workflows" ? "🔄" : "📋"}
            </span>
            <span className="text-slate-200 text-xs font-medium truncate">
              {tmpl.templateName}
            </span>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-slate-600 hover:text-red-400 text-xs flex-shrink-0 transition-colors"
              title="Delete template"
            >
              ✕
            </button>
          )}
        </div>

        <p className="text-slate-500 text-xs truncate">
          {tmpl.moduleName}
          {tmpl.steps.length > 0 ? ` · ${tmpl.steps.length} step${tmpl.steps.length > 1 ? "s" : ""}` : ""}
          {urlPath ? ` · ${urlPath}` : ""}
        </p>

        <button
          onClick={() => handleInsert(tmpl)}
          disabled={!isReady}
          className={`w-full text-center text-xs border rounded px-2 py-1 transition-colors ${
            insertedId === tmpl.templateName
              ? "text-green-400 border-green-700 bg-green-900/20"
              : "text-brand-400 hover:text-brand-300 disabled:text-slate-600 border-slate-700 hover:border-brand-700 disabled:border-slate-800"
          }`}
        >
          {insertedId === tmpl.templateName ? "Inserted ✓" : "Insert →"}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700 flex-shrink-0 flex items-center justify-between">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          Templates
        </p>
        {isReady && (
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="text-slate-500 hover:text-brand-400 transition-colors"
            title="Reload templates from disk"
          >
            <RefreshIcon />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollable px-3 py-2 space-y-3">
        {!isReady && (
          <p className="text-slate-600 text-xs text-center py-4">
            Select a project to load templates.
          </p>
        )}

        {/* Project-specific templates from instructions.example.js — shown first */}
        {isReady && exampleTemplates.length > 0 && (
          <div className="space-y-2">
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
              <span>📋</span> Project Templates
            </p>
            {exampleTemplates.map((tmpl, i) =>
              renderTemplateCard(tmpl, `example-${i}`)
            )}
          </div>
        )}

        {/* Custom user templates */}
        {isReady && (
          <div className="space-y-2">
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
              <span>⭐</span> Custom Templates
            </p>

            {customTemplates.length === 0 && !showSaveInput && (
              <p className="text-slate-600 text-xs py-2 text-center">
                No custom templates yet.
              </p>
            )}

            {customTemplates.map((tmpl, i) =>
              renderTemplateCard(tmpl, `custom-${i}`, () => handleDeleteCustom(i))
            )}

            {showSaveInput ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={savingName}
                  onChange={(e) => setSavingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveAsTemplate();
                    if (e.key === "Escape") { setShowSaveInput(false); setSavingName(""); }
                  }}
                  placeholder="Template name…"
                  autoFocus
                  className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={!savingName.trim()}
                    className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white text-xs rounded px-2 py-1 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveInput(false); setSavingName(""); }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded px-2 py-1 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                className="w-full text-slate-400 hover:text-brand-400 text-xs border border-dashed border-slate-700 hover:border-brand-700 rounded px-2 py-1.5 transition-colors"
              >
                + Save current as template
              </button>
            )}
          </div>
        )}

        {/* Built-in quick-start templates — fallback when no project templates exist */}
        {isReady && (
          <div className="space-y-2">
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
              <span>🚀</span> Quick Start
            </p>
            {builtInTemplates.map((tmpl, i) =>
              renderTemplateCard(tmpl, `builtin-${i}`)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
