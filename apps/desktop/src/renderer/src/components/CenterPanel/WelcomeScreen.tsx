import React, { useEffect, useState } from "react";

function SpecwrightLogo({ size = 48 }: { size?: number }): React.JSX.Element {
  return (
    <svg viewBox="0 0 69 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Specwright logo" width={size} height={size * 40 / 69}>
      <rect x="0"  y="16" width="6" height="8"  rx="3" fill="white"/>
      <rect x="9"  y="10" width="6" height="20" rx="3" fill="white"/>
      <rect x="18" y="5"  width="6" height="30" rx="3" fill="white"/>
      <rect x="27" y="0"  width="6" height="40" rx="3" fill="white"/>
      <rect x="36" y="2"  width="6" height="36" rx="3" fill="white"/>
      <rect x="45" y="8"  width="6" height="24" rx="3" fill="white"/>
      <rect x="54" y="13" width="6" height="14" rx="3" fill="white"/>
      <rect x="63" y="17" width="6" height="6"  rx="3" fill="white"/>
    </svg>
  );
}
import { useConfigStore } from "@renderer/store/config.store";

type AuthStrategy = "email-password" | "oauth" | "none";

const AUTH_STRATEGIES: { value: AuthStrategy; title: string; desc: string }[] = [
  {
    value: "email-password",
    title: "Email + Password",
    desc: "Two-step login (email → password → optional 2FA). Installs @Authentication module.",
  },
  {
    value: "oauth",
    title: "OAuth",
    desc: "Click-based SSO or mock sign-in button. Includes localStorage injection fast-path.",
  },
  {
    value: "none",
    title: "No auth",
    desc: "Public site — skip login. @Authentication module will NOT be installed.",
  },
];

export default function WelcomeScreen(): React.JSX.Element {
  const { projectState, bootstrapLog, appendBootstrapLog, bootstrapAt, loadExistingProject } = useConfigStore();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [authStrategy, setAuthStrategy] = useState<AuthStrategy>("email-password");

  const isBootstrapping = projectState === "bootstrapping";
  const hasError = projectState === "error";

  // Wire bootstrap log IPC events
  useEffect(() => {
    const off = window.specwright.project.onBootstrapLog(({ line }) => appendBootstrapLog(line));
    return off;
  }, [appendBootstrapLog]);

  const handlePickFolder = async (): Promise<void> => {
    const folder = await window.specwright.project.pickFolder();
    if (!folder) return;
    // If already bootstrapped, load it directly — no auth step needed
    const isReady = await window.specwright.project.isBootstrapped(folder);
    if (isReady) {
      await loadExistingProject(folder);
      return;
    }
    setSelectedFolder(folder);
  };

  const handleBootstrap = async (): Promise<void> => {
    if (!selectedFolder) return;
    await bootstrapAt(selectedFolder, authStrategy);
  };

  const handleBack = (): void => {
    setSelectedFolder(null);
  };

  // ── Step 2: auth strategy selector (after folder picked) ────────────────
  if (selectedFolder) {
    const folderLabel = selectedFolder.split("/").slice(-2).join("/");
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8 py-8 overflow-y-auto">
        <div className="text-center">
          <div className="mb-3 flex justify-center"><SpecwrightLogo size={52} /></div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Bootstrap setup</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Project: <span className="text-slate-200 font-mono text-xs bg-slate-800 px-2 py-1 rounded">…/{folderLabel}</span>
          </p>
        </div>

        <div className="w-full max-w-lg">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Authentication strategy
          </label>
          <p className="text-slate-500 text-xs mb-3">
            How does your app authenticate users? This controls which auth module the plugin installs.
          </p>
          <div className="space-y-2">
            {AUTH_STRATEGIES.map(({ value, title, desc }) => (
              <label
                key={value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  authStrategy === value
                    ? "bg-brand-500/10 border-brand-500/50"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                } ${isBootstrapping ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="radio"
                  name="auth-strategy"
                  value={value}
                  checked={authStrategy === value}
                  onChange={() => setAuthStrategy(value)}
                  disabled={isBootstrapping}
                  className="mt-1 accent-brand-500"
                />
                <div className="flex-1">
                  <div className="text-slate-200 text-sm font-medium">{title}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleBack}
            disabled={isBootstrapping}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium px-4 py-2.5 transition-all text-sm"
          >
            ← Change folder
          </button>
          <button
            onClick={handleBootstrap}
            disabled={isBootstrapping}
            className="flex items-center gap-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-6 py-2.5 transition-all shadow-lg hover:shadow-brand-500/20 text-sm"
          >
            {isBootstrapping ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Bootstrapping…
              </>
            ) : (
              <>Bootstrap project →</>
            )}
          </button>
        </div>

        {(isBootstrapping || hasError) && bootstrapLog.length > 0 && (
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-mono">Bootstrap log</span>
              <button
                onClick={() => navigator.clipboard.writeText(bootstrapLog.join("\n"))}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-0.5 rounded hover:bg-slate-800"
                title="Copy log to clipboard"
              >
                Copy logs
              </button>
            </div>
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
              {bootstrapLog.map((line, i) => (
                <div key={i} className={line.includes("Error") ? "text-red-400" : "text-slate-300"}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasError && (
          <p className="text-red-400 text-sm">
            Bootstrap failed. Check the log above and try again.
          </p>
        )}
      </div>
    );
  }

  // ── Step 1: landing (pick folder) ────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      {/* Logo / Title */}
      <div className="text-center">
        <div className="mb-4 flex justify-center"><SpecwrightLogo size={64} /></div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Specwright</h1>
        <p className="text-slate-400 mt-2 text-sm max-w-sm">
          Describe what to test. Specwright handles the rest.
        </p>
        <p className="text-slate-500 mt-1 text-xs max-w-sm">
          Zero manual coding. Fully automated from exploration to report.
        </p>
      </div>

      {/* Create button — opens folder picker */}
      <button
        onClick={handlePickFolder}
        disabled={isBootstrapping}
        className="flex items-center gap-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-8 py-4 transition-all shadow-lg hover:shadow-brand-500/20 text-base"
      >
        <span className="text-xl">+</span>
        Create new test project
      </button>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-xl">
        {[
          { icon: "🤖", label: "Zero Touch", desc: "Describe in English — AI writes, runs, and heals every test" },
          { icon: "🔍", label: "Live Exploration", desc: "Browser agent discovers selectors before generating a single line" },
          { icon: "📊", label: "Reports Everyone Reads", desc: "Scenarios and results in plain English, plus traces and a quality score for every run" },
        ].map(({ icon, label, desc }) => (
          <div
            key={label}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center"
          >
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-slate-300 text-xs font-medium">{label}</p>
            <p className="text-slate-600 text-xs mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
