"use client";
import React from "react";
import { motion } from "framer-motion";
import { PipelineFlow } from "../pipeline/pipeline-flow";

export function PipelineSection() {
  return (
    <section id="pipeline" className="py-24 px-4 bg-slate-900/50 border-y border-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">The pipeline</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            10 phases. Fully automated.
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            From a plain text description to running BDD tests — one command drives it all.
            Click any phase to explore what it does.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <PipelineFlow />
        </motion.div>

        {/* Phase categories legend */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 flex flex-wrap justify-center gap-4 text-xs"
        >
          {[
            { label: "Phases 1–3: Input", color: "#3b82f6" },
            { label: "Phases 4–5: Explore", color: "#8b5cf6" },
            { label: "Phase 6: Approve ⛔", color: "#f59e0b" },
            { label: "Phase 7: Generate", color: "#10b981" },
            { label: "Phases 8–9: Run + Heal", color: "#f97316" },
            { label: "Phase 10: Review", color: "#eab308" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-400">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
