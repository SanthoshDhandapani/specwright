import React from "react";

interface Props {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

export default function ThreePanelLayout({ left, center, right }: Props): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden">
      {/* macOS traffic light spacer */}
      <div
        className="flex flex-col bg-slate-800 border-r border-slate-700 flex-shrink-0"
        style={{ width: 280, paddingTop: 38 /* clearance for native traffic lights */ }}
      >
        {left}
      </div>

      {/* Center — flex grows */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Title bar drag region */}
        <div
          className="h-9 bg-slate-900 flex-shrink-0 flex items-center px-4"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <span className="text-slate-400 text-xs font-medium tracking-widest uppercase select-none">
            Specwright
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">{center}</div>
      </div>

      {/* Right panel */}
      <div
        className="flex flex-col bg-slate-950 border-l border-slate-700 flex-shrink-0 overflow-hidden"
        style={{ width: 360 }}
      >
        {right}
      </div>
    </div>
  );
}
