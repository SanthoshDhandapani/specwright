import React, { useState, useRef } from "react";
import type { PluginSource } from "@renderer/store/config.store";

type PluginTab = "local" | "npm";

export function PluginPickerModal({
  onClose,
  onApply,
  onReset,
}: {
  onClose: () => void;
  onApply: (source: PluginSource) => void;
  onReset: () => void;
}): React.JSX.Element {
  const [tab, setTab] = useState<PluginTab>("local");
  const [localPath, setLocalPath] = useState("");
  const [localValidation, setLocalValidation] = useState<{ valid: boolean; pluginName?: string; error?: string } | null>(null);
  const [npmPackage, setNpmPackage] = useState("@specwright/plugin-");
  const [npmRegistry, setNpmRegistry] = useState("");
  const [validating, setValidating] = useState(false);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputCls = "w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600";

  const handleBrowseLocal = async (): Promise<void> => {
    const picked = await window.specwright.project.pickFolder();
    if (picked) {
      setLocalPath(picked);
      setLocalValidation(null);
      validateDir(picked);
    }
  };

  const validateDir = (dirPath: string): void => {
    if (!dirPath.trim()) { setLocalValidation(null); return; }
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    setValidating(true);
    validationTimeoutRef.current = setTimeout(async () => {
      const result = await window.specwright.project.validatePlugin(dirPath);
      setLocalValidation(result);
      setValidating(false);
    }, 400);
  };

  const canApply =
    (tab === "local" && localValidation?.valid) ||
    (tab === "npm" && npmPackage.trim().length > 3 && npmPackage.trim() !== "@specwright/plugin-");

  const handleApply = (): void => {
    if (!canApply) return;
    if (tab === "local") {
      onApply({ type: "local", dirPath: localPath });
    } else {
      onApply({ type: "npm", packageName: npmPackage.trim(), registry: npmRegistry.trim() || undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[380px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 className="text-slate-200 text-sm font-semibold">Select Plugin</h2>
            <p className="text-slate-500 text-xs mt-0.5">Plugins configure your test framework for your app</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
        </div>

        <div className="flex border-b border-slate-700">
          {(["local", "npm"] as PluginTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs py-2 transition-colors ${tab === t ? "text-brand-400 border-b-2 border-brand-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              {t === "local" ? "Local" : "npm"}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 space-y-3">
          {tab === "local" && (
            <>
              <p className="text-slate-500 text-xs">Browse to your org's plugin directory. It must contain a <span className="font-mono text-slate-400">specwright.plugin.json</span> file.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => { setLocalPath(e.target.value); validateDir(e.target.value); }}
                  placeholder="/path/to/plugin-directory"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={handleBrowseLocal}
                  className="text-xs px-3 py-1.5 rounded bg-slate-700 border border-slate-600 hover:border-brand-500 text-slate-300 hover:text-brand-400 transition-colors flex-shrink-0"
                >
                  Browse
                </button>
              </div>
              {validating && <p className="text-slate-500 text-xs">Validating…</p>}
              {!validating && localValidation && (
                localValidation.valid ? (
                  <p className="text-green-400 text-xs">✓ <span className="font-mono">{localValidation.pluginName}</span></p>
                ) : (
                  <p className="text-red-400 text-xs">{localValidation.error}</p>
                )
              )}
            </>
          )}

          {tab === "npm" && (
            <>
              <p className="text-slate-500 text-xs">Install a plugin from npm. Use your org's private registry if the plugin is not public.</p>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Package name</label>
                <input
                  type="text"
                  value={npmPackage}
                  onChange={(e) => setNpmPackage(e.target.value)}
                  placeholder="@specwright/plugin-mui"
                  className={inputCls}
                />
                <p className="text-slate-600 text-xs mt-0.5">Convention: <span className="font-mono">@specwright/plugin-*</span></p>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Registry <span className="text-slate-600">(optional)</span></label>
                <input
                  type="text"
                  value={npmRegistry}
                  onChange={(e) => setNpmRegistry(e.target.value)}
                  placeholder="https://npm.your-org.com"
                  className={inputCls}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
          <button
            onClick={() => { onReset(); onClose(); }}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Use default
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs px-3 py-1.5 rounded transition-colors">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              className="text-xs px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-brand-600 hover:bg-brand-500 text-white"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
