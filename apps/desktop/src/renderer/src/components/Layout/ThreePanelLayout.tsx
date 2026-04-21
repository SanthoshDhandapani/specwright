import React, { useState, useEffect } from "react";

interface Props {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
}

/** Sidebar / panel layout icon — rectangle split into two columns, one highlighted */
function LayoutIcon({ highlight }: { highlight: "left" | "right" }): React.JSX.Element {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
      {/* outer border */}
      <rect x="0.5" y="0.5" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1" />
      {/* divider */}
      <line x1="5" y1="1" x2="5" y2="11" stroke="currentColor" strokeWidth="1" />
      {/* highlighted pane */}
      {highlight === "left" ? (
        <rect x="1" y="1" width="4" height="10" fill="currentColor" rx="1" />
      ) : (
        <rect x="6" y="1" width="8" height="10" fill="currentColor" rx="1" />
      )}
    </svg>
  );
}

const ICON_BTN =
  "flex items-center justify-center w-7 h-7 rounded " +
  "text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 " +
  "transition-colors duration-100";

// Horizontal inset from window edge for the toggle buttons.
// Left side needs extra room for macOS traffic lights (~78 px).
const LEFT_BTN_INSET = 86; // px from left edge of center panel when left panel is collapsed
const RIGHT_BTN_INSET = 10; // px from right edge of window

type UpdateState = { status: "idle" } | { status: "available"; version: string } | { status: "downloaded"; version: string };

export default function ThreePanelLayout({ left, center, right }: Props): React.JSX.Element {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    const offAvailable = window.specwright.app.onUpdateAvailable(({ version }) =>
      setUpdateState({ status: "available", version })
    );
    const offDownloaded = window.specwright.app.onUpdateDownloaded(({ version }) =>
      setUpdateState({ status: "downloaded", version })
    );
    return () => { offAvailable(); offDownloaded(); };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden">

      {/* ── Left panel ── */}
      <div
        className="flex flex-col bg-slate-800 border-r border-slate-700 flex-shrink-0 transition-[width] duration-200 overflow-hidden"
        style={{ width: leftCollapsed ? 0 : 280, paddingTop: 38, minWidth: 0 }}
      >
        {left}
      </div>

      {/* ── Center ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/*
          Title bar — macOS drag region.
          Buttons are absolute so they sit at fixed insets from each edge.
          The "Specwright" label uses inset-0 + flex centering so it is always
          perfectly centred regardless of button positions.
        */}
        <div
          className="relative h-9 bg-slate-900 flex-shrink-0 flex items-center"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          {/* Left panel toggle
              When left panel is visible, center panel starts at x=280, so inset=10 is fine.
              When collapsed, center panel starts at x=0, so we need LEFT_BTN_INSET to clear traffic lights.
              Use CSS transition so it slides with the panel. */}
          <button
            onClick={() => setLeftCollapsed((v) => !v)}
            title={leftCollapsed ? "Show sidebar" : "Hide sidebar"}
            className={ICON_BTN}
            style={{
              position: "absolute",
              left: leftCollapsed ? LEFT_BTN_INSET : 10,
              transition: "left 200ms",
              WebkitAppRegion: "no-drag",
            } as React.CSSProperties}
          >
            <LayoutIcon highlight={leftCollapsed ? "right" : "left"} />
          </button>

          {/* App name + update badge — centred in title bar */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 select-none pointer-events-none">
            <span className="text-slate-500 text-xs font-medium tracking-widest uppercase">
              Specwright
            </span>
            {updateState.status === "downloaded" && (
              <button
                className="pointer-events-auto flex items-center gap-1 bg-brand-500 hover:bg-brand-400 text-white text-xs font-medium px-2 py-0.5 rounded-full transition-colors"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                onClick={() => window.specwright.app.installUpdate()}
                title={`v${updateState.version} available — click to open download page`}
              >
                <span>↑</span> Restart to update
              </button>
            )}
          </div>

          {/* Right panel toggle */}
          {right && (
            <button
              onClick={() => setRightCollapsed((v) => !v)}
              title={rightCollapsed ? "Show panel" : "Hide panel"}
              className={ICON_BTN}
              style={{
                position: "absolute",
                right: RIGHT_BTN_INSET,
                WebkitAppRegion: "no-drag",
              } as React.CSSProperties}
            >
              <LayoutIcon highlight={rightCollapsed ? "left" : "right"} />
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 overflow-hidden">{center}</div>
      </div>

      {/* ── Right panel ── */}
      {right && (
        <div
          className="flex flex-col bg-slate-950 border-l border-slate-700 flex-shrink-0 transition-[width] duration-200 overflow-hidden"
          style={{ width: rightCollapsed ? 0 : 360, minWidth: 0 }}
        >
          {right}
        </div>
      )}
    </div>
  );
}
