import React, { useEffect, useState } from "react";
import { useConfigStore } from "@renderer/store/config.store";

const ENVS = ["qat", "dev", "staging", "prod", "local"];

export default function ConfigPanel(): React.JSX.Element {
  const {
    projectPath, projectState, envVars, loaded,
    pickAndBootstrap, setEnvVar, removeEnvVar, saveEnv,
    skipPermissions, setSkipPermissions,
  } = useConfigStore();

  const [customVarKey, setCustomVarKey] = useState("");
  const [customVarVal, setCustomVarVal] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  const isSensitiveKey = (key: string): boolean =>
    /password|secret|token|api.?key/i.test(key);

  const toggleSecretVisibility = (key: string): void => {
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Sync authRequired from envVars
  useEffect(() => {
    setAuthRequired(Boolean(envVars.TEST_USERNAME));
  }, [envVars.TEST_USERNAME]);

  const basename = (p: string): string => p.replace(/\\/g, "/").split("/").pop() ?? p;

  const handleAddCustomVar = (): void => {
    const key = customVarKey.trim().toUpperCase().replace(/\s+/g, "_");
    if (!key) return;
    setEnvVar(key, customVarVal);
    setCustomVarKey("");
    setCustomVarVal("");
  };

  const handleBlurSave = (): void => {
    saveEnv();
  };

  const handleAuthToggle = (checked: boolean): void => {
    setAuthRequired(checked);
    if (!checked) {
      removeEnvVar("TEST_USERNAME");
      removeEnvVar("TEST_PASSWORD");
    } else {
      setEnvVar("TEST_USERNAME", "");
      setEnvVar("TEST_PASSWORD", "");
    }
  };

  // Keys with dedicated UI controls — not shown in the generic custom vars list
  const managedKeys = new Set([
    "BASE_URL", "TEST_ENV", "TEST_USERNAME", "TEST_PASSWORD",
    "HEADLESS", "TEST_TIMEOUT", "ENABLE_SCREENSHOTS", "ENABLE_VIDEO_RECORDING", "ENABLE_TRACING",
    // Framework internals — preserved but hidden
    "BASE_ENV", "NODE_ENV", "BROWSER", "CHROME_ARGS",
    "CUCUMBER_REPORT_PATH", "CODEGEN_OUTPUT_PATH",
    "RETAIN_VIDEO_ON_SUCCESS", "VITE_BUILD_ENVIRONMENT",
  ]);

  // Only truly custom user-added vars show in the generic list
  const customVars = Object.entries(envVars).filter(([k]) => !managedKeys.has(k));

  const isReady = projectState === "ready";

  return (
    <div className="flex flex-col h-full px-4 py-3 gap-4 overflow-y-auto scrollable">

      {/* Header */}
      <div>
        <h1 className="text-brand-400 font-semibold text-base tracking-tight">Specwright</h1>
        <p className="text-slate-500 text-xs mt-0.5">AI Test Generation</p>
      </div>

      <hr className="border-slate-700" />

      {/* Project section */}
      <section className="space-y-2">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Project</p>

        {isReady ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-green-400 text-xs font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Ready
              </p>
              <button
                onClick={pickAndBootstrap}
                className="text-slate-500 hover:text-brand-400 text-xs transition-colors"
                title="Change project"
              >
                Change
              </button>
            </div>
            <p className="text-slate-300 text-xs mt-1 truncate font-mono" title={projectPath}>
              {basename(projectPath)}
            </p>
            <p className="text-slate-600 text-xs truncate" title={projectPath}>
              {projectPath}
            </p>
          </div>
        ) : (
          <button
            onClick={pickAndBootstrap}
            disabled={!loaded || projectState === "bootstrapping"}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-600 hover:border-brand-500 text-slate-400 hover:text-brand-400 text-xs rounded-lg px-3 py-2.5 transition-colors disabled:opacity-40"
          >
            {projectState === "bootstrapping" ? (
              <>
                <span className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin" />
                Bootstrapping…
              </>
            ) : (
              <>+ Create new test project</>
            )}
          </button>
        )}
      </section>

      {/* Settings — only shown when project is ready */}
      {isReady && (
        <>
          <hr className="border-slate-700" />

          <section className="space-y-3">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Settings</p>

            {/* App URL */}
            <div>
              <label className="block text-slate-300 text-xs mb-1">App URL</label>
              <input
                type="text"
                value={envVars.BASE_URL ?? ""}
                onChange={(e) => setEnvVar("BASE_URL", e.target.value)}
                onBlur={handleBlurSave}
                placeholder="https://app.example.com"
                className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
              />
            </div>

            {/* Environment — only shown if TEST_ENV has a value in .env.testing */}
            {envVars.TEST_ENV && (
              <div>
                <label className="block text-slate-300 text-xs mb-1">Environment</label>
                <select
                  value={envVars.TEST_ENV ?? "qat"}
                  onChange={(e) => { setEnvVar("TEST_ENV", e.target.value); saveEnv(); }}
                  className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500"
                >
                  {ENVS.map((env) => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Auth */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authRequired}
                  onChange={(e) => handleAuthToggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-brand-500"
                />
                <span className="text-slate-300 text-xs">Auth Required</span>
              </label>

              {authRequired && (
                <div className="space-y-2 pl-5">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Username</label>
                    <input
                      type="text"
                      value={envVars.TEST_USERNAME ?? ""}
                      onChange={(e) => setEnvVar("TEST_USERNAME", e.target.value)}
                      onBlur={handleBlurSave}
                      placeholder="user@example.com"
                      className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Password</label>
                    <input
                      type="password"
                      value={envVars.TEST_PASSWORD ?? ""}
                      onChange={(e) => setEnvVar("TEST_PASSWORD", e.target.value)}
                      onBlur={handleBlurSave}
                      placeholder="••••••••"
                      className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Execution Settings */}
            <div className="space-y-2.5">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Test Execution</p>

              {/* Headless */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300 text-xs">Headless Mode</span>
                <button
                  onClick={() => { setEnvVar("HEADLESS", envVars.HEADLESS === "true" ? "false" : "true"); saveEnv(); }}
                  className={`w-8 h-4 rounded-full transition-colors relative ${envVars.HEADLESS === "true" ? "bg-brand-600" : "bg-slate-600"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${envVars.HEADLESS === "true" ? "left-4" : "left-0.5"}`} />
                </button>
              </label>

              {/* Test Timeout */}
              <div>
                <label className="block text-slate-300 text-xs mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={envVars.TEST_TIMEOUT ?? "120000"}
                  onChange={(e) => setEnvVar("TEST_TIMEOUT", e.target.value)}
                  onBlur={handleBlurSave}
                  className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Screenshots */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">Screenshots</span>
                <select
                  value={envVars.ENABLE_SCREENSHOTS === "true" ? "failure" : "off"}
                  onChange={(e) => { setEnvVar("ENABLE_SCREENSHOTS", e.target.value === "off" ? "false" : "true"); saveEnv(); }}
                  className="bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-brand-500"
                >
                  <option value="failure">On Failure</option>
                  <option value="off">Off</option>
                </select>
              </div>

              {/* Video Recording */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">Video Recording</span>
                <select
                  value={
                    envVars.ENABLE_VIDEO_RECORDING !== "true" ? "off" :
                    envVars.RETAIN_VIDEO_ON_SUCCESS === "true" ? "always" : "failure"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setEnvVar("ENABLE_VIDEO_RECORDING", val === "off" ? "false" : "true");
                    setEnvVar("RETAIN_VIDEO_ON_SUCCESS", val === "always" ? "true" : "false");
                    saveEnv();
                  }}
                  className="bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-brand-500"
                >
                  <option value="failure">On Failure</option>
                  <option value="always">Always</option>
                  <option value="off">Off</option>
                </select>
              </div>

              {/* Tracing */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300 text-xs">Tracing</span>
                <button
                  onClick={() => { setEnvVar("ENABLE_TRACING", envVars.ENABLE_TRACING === "true" ? "false" : "true"); saveEnv(); }}
                  className={`w-8 h-4 rounded-full transition-colors relative ${envVars.ENABLE_TRACING === "true" ? "bg-brand-600" : "bg-slate-600"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${envVars.ENABLE_TRACING === "true" ? "left-4" : "left-0.5"}`} />
                </button>
              </label>

              <hr className="border-slate-700 my-1" />

              {/* Skip Permissions */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-slate-300 text-xs">Auto-Approve All</span>
                  <p className="text-slate-600 text-xs mt-0.5">Skip permission prompts</p>
                </div>
                <button
                  onClick={() => setSkipPermissions(!skipPermissions)}
                  className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${skipPermissions ? "bg-amber-500" : "bg-slate-600"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${skipPermissions ? "left-4" : "left-0.5"}`} />
                </button>
              </label>
              {skipPermissions && (
                <p className="text-amber-400/80 text-xs pl-1">
                  ⚠ All tool calls (Bash, Write, etc.) will run without asking
                </p>
              )}
            </div>

            {/* Custom vars */}
            {customVars.length > 0 && (
              <div className="space-y-1.5">
                {customVars.map(([key, val]) => {
                  const sensitive = isSensitiveKey(key);
                  const isVisible = visibleSecrets.has(key);
                  return (
                    <div key={key} className="flex gap-1 items-center">
                      <span className="text-slate-500 text-xs font-mono flex-shrink-0 w-20 truncate" title={key}>{key}</span>
                      <div className="flex-1 min-w-0 relative">
                        <input
                          type={sensitive && !isVisible ? "password" : "text"}
                          value={val ?? ""}
                          onChange={(e) => setEnvVar(key, e.target.value)}
                          onBlur={handleBlurSave}
                          className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 pr-6 border border-slate-600 focus:outline-none focus:border-brand-500"
                        />
                        {sensitive && (
                          <button
                            type="button"
                            onClick={() => toggleSecretVisibility(key)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                            title={isVisible ? "Hide value" : "Show value"}
                          >
                            {isVisible ? "🙈" : "👁"}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => { removeEnvVar(key); saveEnv(); }}
                        className="text-slate-600 hover:text-red-400 text-xs flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add custom var */}
            <div className="space-y-1.5">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={customVarKey}
                  onChange={(e) => setCustomVarKey(e.target.value)}
                  placeholder="VAR_NAME"
                  className="flex-1 min-w-0 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600 font-mono"
                />
                <input
                  type="text"
                  value={customVarVal}
                  onChange={(e) => setCustomVarVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomVar(); }}
                  placeholder="value"
                  className="flex-1 min-w-0 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
                />
              </div>
              <button
                onClick={handleAddCustomVar}
                className="text-slate-400 hover:text-brand-400 text-xs transition-colors"
              >
                + Add var
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
