"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { cn } from "../ui/cn";

const PHASES = [
  {
    id: 1,
    label: "Config",
    description: "Read instructions.js",
    icon: "⚙️",
    color: "#3b82f6",
    glow: "shadow-blue-500/50",
    reads: "instructions.js",
    writes: "parsed config",
    agent: "input-processor",
  },
  {
    id: 2,
    label: "Validate",
    description: "Validate inputs",
    icon: "✅",
    color: "#3b82f6",
    glow: "shadow-blue-500/50",
    reads: "config object",
    writes: "validated config",
    agent: "input-validator",
  },
  {
    id: 3,
    label: "Plan",
    description: "Extract test plan",
    icon: "📋",
    color: "#3b82f6",
    glow: "shadow-blue-500/50",
    reads: "instructions",
    writes: "plan.md",
    agent: "plan-extractor",
  },
  {
    id: 4,
    label: "Explore",
    description: "Browser exploration",
    icon: "🌐",
    color: "#8b5cf6",
    glow: "shadow-purple-500/50",
    reads: "pageURL",
    writes: "seed.spec.js",
    agent: "playwright-test-planner",
  },
  {
    id: 5,
    label: "Seed",
    description: "Generate seed tests",
    icon: "🌱",
    color: "#8b5cf6",
    glow: "shadow-purple-500/50",
    reads: "plan + seed",
    writes: "seed test file",
    agent: "seed-generator",
  },
  {
    id: 6,
    label: "Approve",
    description: "Human review gate",
    icon: "👤",
    color: "#f59e0b",
    glow: "shadow-amber-500/50",
    reads: "plan + seed",
    writes: "approval",
    agent: "— you —",
    isGate: true,
  },
  {
    id: 7,
    label: "Generate",
    description: "BDD feature + steps",
    icon: "✍️",
    color: "#10b981",
    glow: "shadow-emerald-500/50",
    reads: "plan + seed",
    writes: ".feature + steps.js",
    agent: "bdd-generator + code-generator",
  },
  {
    id: 8,
    label: "Execute",
    description: "Run playwright tests",
    icon: "▶️",
    color: "#f97316",
    glow: "shadow-orange-500/50",
    reads: ".feature files",
    writes: "test results",
    agent: "execution-manager",
  },
  {
    id: 9,
    label: "Heal",
    description: "Auto-fix failures",
    icon: "🔧",
    color: "#f97316",
    glow: "shadow-orange-500/50",
    reads: "test errors",
    writes: "fixed steps",
    agent: "playwright-healer",
  },
  {
    id: 10,
    label: "Review",
    description: "Quality score report",
    icon: "⭐",
    color: "#eab308",
    glow: "shadow-yellow-500/50",
    reads: "all outputs",
    writes: "quality-report.md",
    agent: "quality-reviewer",
  },
];

export function PipelineFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });
  const [activePhase, setActivePhase] = useState<number>(-1);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [beamProgress, setBeamProgress] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let phase = 0;
    setActivePhase(-1);
    setBeamProgress(0);

    const interval = setInterval(() => {
      if (phase >= PHASES.length) {
        setTimeout(() => {
          phase = 0;
          setActivePhase(-1);
          setBeamProgress(0);
        }, 2000);
        clearInterval(interval);
        return;
      }
      setActivePhase(phase);
      setBeamProgress(((phase + 1) / PHASES.length) * 100);
      phase++;
    }, 700);

    return () => clearInterval(interval);
  }, [isInView]);

  const selected = selectedPhase !== null ? PHASES[selectedPhase] : null;

  return (
    <div ref={ref} className="w-full">
      {/* Desktop: horizontal flow */}
      <div className="hidden lg:block overflow-x-auto pb-6">
        <div className="relative min-w-[1100px] px-8 pt-6">
          {/* Beam track — top-[50px] = pt-6 (24px) + half circle height (26px) */}
          <div className="absolute top-[50px] left-16 right-16 h-[2px] bg-slate-800 rounded-full z-0" />

          {/* Animated beam fill */}
          <motion.div
            className="absolute top-[50px] left-16 h-[2px] rounded-full z-0"
            style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981, #f97316, #eab308)" }}
            animate={{ width: `calc(${beamProgress}% - 4rem)` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {/* Phase nodes */}
          <div className="relative flex justify-between items-start z-10">
            {PHASES.map((phase, idx) => (
              // relative + z-index on the column so the active button's shadow
              // paints above its neighbours (later DOM siblings otherwise cover it)
              <div
                key={phase.id}
                className="relative flex flex-col items-center gap-3 w-[96px]"
                style={{ zIndex: activePhase === idx ? 20 : 1 }}
              >
                {/* Node circle — pulse via box-shadow so it never overflows layout */}
                <motion.button
                  onClick={() => setSelectedPhase(selectedPhase === idx ? null : idx)}
                  className={cn(
                    "relative w-[52px] h-[52px] rounded-full border-2 flex items-center justify-center text-xl cursor-pointer shrink-0",
                    activePhase >= idx ? "border-current" : "border-slate-700 bg-slate-900"
                  )}
                  style={{ borderColor: activePhase >= idx ? phase.color : undefined }}
                  animate={{
                    backgroundColor: activePhase >= idx ? `${phase.color}20` : "#0f172a",
                    // box-shadow pulse stays inside layout box — no overflow clipping ever
                    boxShadow:
                      activePhase === idx
                        ? [
                            `0 0 0 0px ${phase.color}cc, 0 0 20px 4px ${phase.color}40`,
                            `0 0 0 18px ${phase.color}00, 0 0 20px 4px ${phase.color}40`,
                          ]
                        : `0 0 0 0px ${phase.color}00, 0 0 0 0px ${phase.color}00`,
                  }}
                  transition={{
                    backgroundColor: { duration: 0.3 },
                    boxShadow: activePhase === idx
                      ? { repeat: Infinity, duration: 1.1, ease: "easeOut" }
                      : { duration: 0.3 },
                  }}
                >
                  {phase.isGate && activePhase === idx ? (
                    <motion.span
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      ⏸️
                    </motion.span>
                  ) : (
                    <span>{phase.icon}</span>
                  )}
                </motion.button>

                {/* Phase label */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-semibold transition-colors duration-300",
                      activePhase >= idx ? "text-white" : "text-slate-500"
                    )}
                    style={{ color: activePhase >= idx ? phase.color : undefined }}
                  >
                    P{phase.id}
                  </p>
                  <p className={cn("text-[11px] mt-0.5", activePhase >= idx ? "text-slate-300" : "text-slate-600")}>
                    {phase.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase detail card */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 mx-auto max-w-lg rounded-xl border bg-slate-900/80 backdrop-blur-sm p-5"
            style={{ borderColor: selected.color + "50" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{selected.icon}</span>
              <div>
                <h3 className="font-semibold text-white">Phase {selected.id}: {selected.label}</h3>
                <p className="text-sm text-slate-400">{selected.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-800/60 rounded-lg p-3">
                <p className="text-slate-500 mb-1">Reads</p>
                <p className="text-slate-200 font-mono">{selected.reads}</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3">
                <p className="text-slate-500 mb-1">Writes</p>
                <p className="text-slate-200 font-mono">{selected.writes}</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3">
                <p className="text-slate-500 mb-1">Agent</p>
                <p className="text-slate-200 font-mono text-[10px]">{selected.agent}</p>
              </div>
            </div>
            {selected.isGate && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                ⛔ Pipeline pauses here — review the exploration output before approving generation.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: vertical list */}
      <div className="lg:hidden mt-6 space-y-3">
        {PHASES.map((phase, idx) => (
          <motion.div
            key={phase.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50"
            animate={{ borderColor: activePhase >= idx ? phase.color + "50" : undefined }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 border-2 transition-colors duration-300"
              style={{ borderColor: activePhase >= idx ? phase.color : "#334155" }}
            >
              {phase.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-white">Phase {phase.id}: {phase.label}</p>
              <p className="text-xs text-slate-400">{phase.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
