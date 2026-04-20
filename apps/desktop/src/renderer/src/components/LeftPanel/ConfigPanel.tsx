import React, { useEffect, useState } from "react";
import { useConfigStore } from "@renderer/store/config.store";
import { AuthSettingsModal, EMPTY_AUTH, isOAuthConfigured, isEmailPasswordConfigured } from "./AuthSettingsModal";
import type { AuthFields } from "./AuthSettingsModal";
import { PluginPickerModal } from "./PluginPickerModal";

const ENVS = ["qat", "dev", "staging", "prod", "local"];

const SyncButtonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
);

export default function ConfigPanel(): React.JSX.Element {
  const {
    projectPath, projectState, envVars, loaded,
    pickAndBootstrap, loadExistingProject, setEnvVar, removeEnvVar, saveEnv,
    skipPermissions, setSkipPermissions, pendingPlugin, setPendingPlugin, resetProject,
  } = useConfigStore();

  const [customVarKey, setCustomVarKey] = useState("");
  const [customVarVal, setCustomVarVal] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [authFields, setAuthFields] = useState<AuthFields>(EMPTY_AUTH);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPluginModal, setShowPluginModal] = useState(false);
  const [pluginInfo, setPluginInfo] = useState<PluginInfo | null>(null);
  const [applyingPlugin, setApplyingPlugin] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const authStrategy = (envVars.AUTH_STRATEGY || "none") as string;
  const authRequired = authStrategy !== "none";

  useEffect(() => {
    if (!projectPath || !loaded) return;
    window.specwright.project.detectPlugin(projectPath).then(setPluginInfo).catch(() => null);
  }, [projectPath, loaded]);

  useEffect(() => {
    if (!projectPath || !loaded) return;
    setAuthFields({
      userEmail:    (envVars.TEST_USER_EMAIL        as string) ?? "",
      userName:     (envVars.TEST_USER_NAME         as string) ?? "",
      userPicture:  (envVars.TEST_USER_PICTURE      as string) ?? "",
      storageKey:   (envVars.OAUTH_STORAGE_KEY      as string) ?? "",
      signinPath:   (envVars.OAUTH_SIGNIN_PATH      as string) ?? "",
      buttonTestId: (envVars.OAUTH_BUTTON_TEST_ID   as string) ?? "",
      postLoginUrl: (envVars.OAUTH_POST_LOGIN_URL   as string) ?? "",
      password:     (envVars.TEST_USER_PASSWORD     as string) ?? "",
    });
  }, [projectPath, loaded, envVars]);

  const isConfigured = authRequired
    ? authStrategy === "oauth"
      ? isOAuthConfigured(authFields)
      : isEmailPasswordConfigured(authFields)
    : true;

  const handleAuthToggle = (checked: boolean): void => {
    if (!checked) {
      setEnvVar("AUTH_STRATEGY", "none");
      saveEnv();
    } else {
      setEnvVar("AUTH_STRATEGY", "oauth");
      saveEnv();
      if (!isOAuthConfigured(authFields) && !isEmailPasswordConfigured(authFields)) {
        setShowAuthModal(true);
      }
    }
  };

  const handleAuthStrategyChange = (strategy: string): void => {
    setEnvVar("AUTH_STRATEGY", strategy);
    saveEnv();
    setShowAuthModal(true);
  };

  const handleSaveAuth = (fields: AuthFields): void => {
    const set = (k: string, v: string): void => { if (v) setEnvVar(k, v); else removeEnvVar(k); };
    set("TEST_USER_EMAIL",      fields.userEmail);
    set("TEST_USER_PASSWORD",   fields.password);
    set("TEST_USER_NAME",       fields.userName);
    set("TEST_USER_PICTURE",    fields.userPicture);
    set("OAUTH_STORAGE_KEY",    fields.storageKey);
    set("OAUTH_SIGNIN_PATH",    fields.signinPath);
    set("OAUTH_BUTTON_TEST_ID", fields.buttonTestId);
    set("OAUTH_POST_LOGIN_URL", fields.postLoginUrl);
    saveEnv();
    setAuthFields(fields);
    setShowAuthModal(false);
  };

  const handleApplyPlugin = async (source: PluginSource): Promise<void> => {
    setShowPluginModal(false);
    if (!isReady) {
      setPendingPlugin(source);
      return;
    }
    setApplyingPlugin(true);
    try {
      await window.specwright.project.bootstrap(projectPath, { overlay: source });
      const updated = await window.specwright.project.detectPlugin(projectPath);
      setPluginInfo(updated);
    } finally {
      setApplyingPlugin(false);
    }
  };

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

  const basename = (p: string): string => p.replace(/\\/g, "/").split("/").pop() ?? p;

  const handleAddCustomVar = (): void => {
    const key = customVarKey.trim().toUpperCase().replace(/\s+/g, "_");
    if (!key) return;
    setEnvVar(key, customVarVal);
    setCustomVarKey("");
    setCustomVarVal("");
  };

  const managedKeys = new Set([
    "BASE_URL", "TEST_ENV", "AUTH_STRATEGY",
    "TEST_USERNAME", "TEST_PASSWORD", "TEST_USER_EMAIL", "TEST_USER_PASSWORD",
    "TEST_USER_NAME", "TEST_USER_PICTURE",
    "OAUTH_STORAGE_KEY", "OAUTH_SIGNIN_PATH", "OAUTH_BUTTON_TEST_ID", "OAUTH_POST_LOGIN_URL",
    "HEADLESS", "TEST_TIMEOUT", "ENABLE_SCREENSHOTS", "ENABLE_VIDEO_RECORDING", "ENABLE_TRACING",
    "BASE_ENV", "NODE_ENV", "BROWSER", "CHROME_ARGS",
    "CUCUMBER_REPORT_PATH", "CODEGEN_OUTPUT_PATH",
    "RETAIN_VIDEO_ON_SUCCESS", "VITE_BUILD_ENVIRONMENT",
  ]);

  const customVars = Object.entries(envVars).filter(([k]) => !managedKeys.has(k));
  const isReady = projectState === "ready";

  return (
    <>
      {showAuthModal && (
        <AuthSettingsModal
          strategy={authStrategy}
          initial={authFields}
          onSave={handleSaveAuth}
          onClose={() => setShowAuthModal(false)}
        />
      )}
      {showPluginModal && (
        <PluginPickerModal
          onClose={() => setShowPluginModal(false)}
          onApply={handleApplyPlugin}
          onReset={() => setPendingPlugin(null)}
        />
      )}

      <div className="flex flex-col h-full px-4 py-3 gap-4 overflow-y-auto scrollable">

        <div>
          <h1 className="text-brand-400 font-semibold text-base tracking-tight">Specwright</h1>
          <p className="text-slate-500 text-xs mt-0.5">AI Test Generation</p>
        </div>

        <hr className="border-slate-700" />

        {/* Project section */}
        <section className="space-y-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Project</p>

          {isReady ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <p className="text-green-400 text-xs font-medium flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    Ready
                  </p>
                  <button
                    onClick={() => loadExistingProject(projectPath)}
                    className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                    title="Sync project — reload .env.testing from disk"
                  >
                    <SyncButtonIcon />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {confirmReset ? (
                    <>
                      <span className="text-slate-500 text-xs">Close?</span>
                      <button
                        onClick={() => { resetProject(); setConfirmReset(false); }}
                        className="text-red-400 hover:text-red-300 text-xs border border-red-800 hover:border-red-600 rounded px-1.5 py-0.5 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmReset(false)}
                        className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmReset(true)}
                        title="Close project"
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      </button>
                      <button
                        onClick={pickAndBootstrap}
                        className="text-slate-500 hover:text-brand-400 text-xs transition-colors"
                        title="Change project"
                      >
                        Change
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-slate-300 text-xs truncate font-mono" title={projectPath}>
                {basename(projectPath)}
              </p>
              <p className="text-slate-600 text-xs truncate" title={projectPath}>
                {projectPath}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <div className="min-w-0">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">Plugin</p>
                  {applyingPlugin ? (
                    <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 border border-brand-400 border-t-transparent rounded-full animate-spin inline-block" />
                      Installing…
                    </p>
                  ) : pluginInfo && pluginInfo.name !== "none" ? (
                    <p className="text-slate-300 text-xs font-mono truncate mt-0.5" title={pluginInfo.name}>
                      {pluginInfo.hasOverlay ? pluginInfo.overlayName : pluginInfo.name}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-xs font-mono mt-0.5">@specwright/plugin</p>
                  )}
                </div>
                <button
                  onClick={() => setShowPluginModal(true)}
                  disabled={applyingPlugin}
                  className="text-slate-500 hover:text-brand-400 text-xs transition-colors flex-shrink-0 ml-2 disabled:opacity-40"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">Plugin</p>
                  {pendingPlugin ? (
                    <p className="text-brand-400 text-xs font-mono truncate mt-0.5">
                      {pendingPlugin.type === "local"
                        ? pendingPlugin.dirPath.split("/").pop()
                        : pendingPlugin.packageName}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-xs font-mono mt-0.5">@specwright/plugin</p>
                  )}
                </div>
                <button
                  onClick={() => setShowPluginModal(true)}
                  className="text-slate-500 hover:text-brand-400 text-xs transition-colors flex-shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Settings — only shown when project is ready */}
        {isReady && (
          <>
            <hr className="border-slate-700" />

            <section className="space-y-3">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Settings</p>

              <div>
                <label className="block text-slate-300 text-xs mb-1">App URL</label>
                <input
                  type="text"
                  value={envVars.BASE_URL ?? ""}
                  onChange={(e) => setEnvVar("BASE_URL", e.target.value)}
                  onBlur={saveEnv}
                  placeholder="https://app.example.com"
                  className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500 placeholder-slate-600"
                />
              </div>

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
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authRequired}
                      onChange={(e) => handleAuthToggle(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-brand-500"
                    />
                    <span className="text-slate-300 text-xs">Auth Required</span>
                  </label>
                </div>

                {authRequired && (
                  <div className="space-y-2 pl-5">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Strategy</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={authStrategy}
                          onChange={(e) => handleAuthStrategyChange(e.target.value)}
                          className="flex-1 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500"
                        >
                          <option value="oauth">OAuth</option>
                          <option value="email-password">Email + Password</option>
                        </select>

                        <button
                          onClick={() => setShowAuthModal(true)}
                          title="Configure auth settings"
                          className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-slate-700 border border-slate-600 hover:border-brand-500 text-slate-400 hover:text-brand-400 transition-colors"
                        >
                          ⚙
                          <span
                            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-slate-800 ${
                              isConfigured ? "bg-green-400" : "bg-red-400 animate-pulse"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {isConfigured ? (
                      <p className="text-slate-500 text-xs">
                        ● Configured as <span className="text-slate-300">{authFields.userEmail}</span>
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="text-amber-400 text-xs hover:text-amber-300 transition-colors text-left"
                      >
                        ⚠ Auth not configured — click ⚙ to set up
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Test Execution Settings */}
              <div className="space-y-2.5">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Test Execution</p>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 text-xs">Headless Mode</span>
                  <button
                    onClick={() => { setEnvVar("HEADLESS", envVars.HEADLESS === "true" ? "false" : "true"); saveEnv(); }}
                    className={`w-8 h-4 rounded-full transition-colors relative ${envVars.HEADLESS === "true" ? "bg-brand-600" : "bg-slate-600"}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${envVars.HEADLESS === "true" ? "left-4" : "left-0.5"}`} />
                  </button>
                </label>

                <div>
                  <label className="block text-slate-300 text-xs mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    value={envVars.TEST_TIMEOUT ?? "120000"}
                    onChange={(e) => setEnvVar("TEST_TIMEOUT", e.target.value)}
                    onBlur={saveEnv}
                    className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

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
                            onBlur={saveEnv}
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
    </>
  );
}
