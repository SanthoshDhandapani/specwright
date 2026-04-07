import React, { useState, useCallback } from "react";
import { useInstructionStore, type InstructionCard as ICard } from "@renderer/store/instruction.store";
import { useConfigStore } from "@renderer/store/config.store";

interface Props {
  card: ICard;
  index: number;
}

const MODE_OPTIONS = [
  { value: "explorer", label: "Explorer" },
  { value: "csv", label: "File" },
] as const;

const SUPPORTED_FILE_EXTENSIONS = ".xlsx,.xls,.csv,.doc,.docx,.pdf,.txt,.md,.json";

const CATEGORY_OPTIONS = [
  { value: "@Modules", label: "@Modules" },
  { value: "@Workflows", label: "@Workflows" },
] as const;

export default function InstructionCard({ card, index }: Props): React.JSX.Element {
  const { updateCard, removeCard, addStep, removeStep, updateStep, addSubModule, removeSubModule } =
    useInstructionStore();

  const [subModuleInput, setSubModuleInput] = useState("");

  const update = (patch: Partial<ICard>): void => updateCard(card.id, patch);

  const handleAddSubModule = (): void => {
    const raw = subModuleInput.trim();
    if (raw) {
      const tag = raw.startsWith("@") ? raw : `@${raw}`;
      addSubModule(card.id, tag);
      setSubModuleInput("");
    }
  };

  const isExplorer = card.mode === "explorer";
  const isCsv = card.mode === "csv";
  const hasJira = Boolean(card.jiraURL?.trim());
  const hasFile = Boolean(card.filePath?.trim());

  const handleUploadFile = useCallback(async () => {
    const selected = await window.specwright.project.pickFiles();
    if (selected.length > 0) {
      // Copy file to e2e-tests/data/migrations/files/ and get relative path
      const relativePath = await window.specwright.project.uploadTestFile(selected[0]);
      update({ filePath: relativePath, jiraURL: "" });
    }
  }, [update]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-brand-400 text-xs font-semibold uppercase tracking-wider">
          Instruction {index + 1}
        </span>
        <button
          onClick={() => removeCard(card.id)}
          className="text-slate-600 hover:text-red-400 transition-colors text-base leading-none"
          title="Remove instruction"
        >
          ✕
        </button>
      </div>

      {/* Row: Mode + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Mode</label>
          <select
            value={card.mode}
            onChange={(e) => update({ mode: e.target.value as ICard["mode"] })}
            className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500"
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Category</label>
          <select
            value={card.category}
            onChange={(e) => update({ category: e.target.value as ICard["category"] })}
            className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: Module + File name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Module name</label>
          <div className="flex items-center">
            <span className="text-slate-500 text-xs pr-1">@</span>
            <input
              type="text"
              value={card.moduleName}
              onChange={(e) => update({ moduleName: e.target.value })}
              placeholder="MyModule"
              className="flex-1 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">File name</label>
          <input
            type="text"
            value={card.fileName}
            onChange={(e) => update({ fileName: e.target.value })}
            placeholder="my-feature"
            className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
          />
        </div>
      </div>

      {/* Sub-modules */}
      <div>
        <label className="block text-slate-400 text-xs mb-1">Sub-modules</label>
        <div className="flex gap-2">
          <div className="flex items-center flex-1">
            <span className="text-slate-500 text-xs pr-1">@</span>
            <input
              type="text"
              value={subModuleInput}
              onChange={(e) => setSubModuleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubModule(); } }}
              placeholder="SubModule (press Enter)"
              className="flex-1 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
            />
          </div>
          <button
            onClick={handleAddSubModule}
            className="bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs rounded px-2 py-1.5 transition-colors"
          >
            + tag
          </button>
        </div>
        {card.subModules.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {card.subModules.map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1 bg-brand-900/40 text-brand-300 text-xs rounded px-2 py-0.5 border border-brand-800"
              >
                {tag}
                <button
                  onClick={() => removeSubModule(card.id, i)}
                  className="text-brand-500 hover:text-red-400 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Page URL — Explorer only */}
      {isExplorer && (
        <div>
          <label className="block text-slate-400 text-xs mb-1">Page URL</label>
          <input
            type="text"
            value={card.pageURL}
            onChange={(e) => update({ pageURL: e.target.value })}
            placeholder="https://app.example.com/dashboard"
            className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
          />
        </div>
      )}

      {/* Test Cases Source File — File mode */}
      {isCsv && (
        <div>
          <label className="block text-slate-400 text-xs mb-1">
            Test Cases Source File{" "}
            <span className="text-slate-600">
              ({SUPPORTED_FILE_EXTENSIONS.split(",").map(e => e.replace(".", "")).join(", ")})
            </span>
          </label>
          {card.filePath ? (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
              <span className="text-slate-500 text-xs">📄</span>
              <span className="flex-1 text-slate-300 text-xs font-mono truncate" title={card.filePath}>
                {card.filePath.split("/").pop()}
              </span>
              <button
                onClick={() => update({ filePath: "" })}
                disabled={hasJira}
                className="text-slate-600 hover:text-red-400 text-xs transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={handleUploadFile}
              disabled={hasJira}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm border border-dashed border-slate-600 hover:border-slate-500 disabled:opacity-40 rounded-lg px-3 py-2 w-full justify-center transition-colors"
            >
              <span className="text-base leading-none">📁</span>
              Upload file
            </button>
          )}
          {hasJira && (
            <p className="text-amber-500 text-[10px] mt-1">Disabled — Jira URL is set. Clear Jira URL to use a file.</p>
          )}
        </div>
      )}

      {/* Steps — Explorer only */}
      {isExplorer && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-400 text-xs">Steps</label>
            <button
              onClick={() => addStep(card.id)}
              className="text-brand-400 hover:text-brand-300 text-xs transition-colors"
            >
              + add step
            </button>
          </div>
          <div className="space-y-1.5">
            {card.steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-slate-600 text-xs w-4 text-right flex-shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep(card.id, i, e.target.value)}
                  placeholder={`Step ${i + 1} description…`}
                  className="flex-1 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
                />
                {card.steps.length > 1 && (
                  <button
                    onClick={() => removeStep(card.id, i)}
                    className="text-slate-600 hover:text-red-400 text-xs transition-colors flex-shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jira URL */}
      <div>
        <label className="block text-slate-400 text-xs mb-1">
          Jira URL <span className="text-slate-600">(optional)</span>
        </label>
        <input
          type="text"
          value={card.jiraURL}
          onChange={(e) => update({ jiraURL: e.target.value, filePath: "" })}
          placeholder="https://jira.example.com/browse/PROJ-123"
          disabled={hasFile}
          className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600 disabled:opacity-40"
        />
        {hasFile && (
          <p className="text-amber-500 text-[10px] mt-1">Disabled — file path is set. Clear file path to use Jira.</p>
        )}
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap gap-4 pt-1">
        {isExplorer && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={card.explore}
              onChange={(e) => update({ explore: e.target.checked })}
              className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-slate-300 text-xs">Explore</span>
          </label>
        )}
        {isExplorer && card.explore && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={card.runExploredCases}
              onChange={(e) => update({ runExploredCases: e.target.checked })}
              className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-slate-300 text-xs">Run explored cases</span>
          </label>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={card.runGeneratedCases}
            onChange={(e) => update({ runGeneratedCases: e.target.checked })}
            className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-slate-300 text-xs">Run generated cases</span>
        </label>
      </div>
    </div>
  );
}
