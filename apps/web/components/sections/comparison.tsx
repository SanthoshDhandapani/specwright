"use client";
import React from "react";
import { motion } from "framer-motion";
import { Meteors } from "../ui/meteors";

const ROWS = [
  { feature: "BDD / Gherkin output", specwright: "✅", codegen: "❌", saas: "⚠️ partial" },
  { feature: "100% Local (no cloud)", specwright: "✅", codegen: "✅", saas: "❌" },
  { feature: "10-phase AI pipeline", specwright: "✅", codegen: "❌", saas: "Limited" },
  { feature: "Self-healing (3× auto)", specwright: "✅", codegen: "❌", saas: "✅ SaaS" },
  { feature: "Open Source (MIT)", specwright: "✅", codegen: "✅", saas: "❌" },
  { feature: "Workflow cross-phase", specwright: "✅", codegen: "❌", saas: "⚠️" },
  { feature: "Quality score report", specwright: "✅", codegen: "❌", saas: "Some" },
  { feature: "Extensible via plugins", specwright: "✅", codegen: "❌", saas: "⚠️ limited" },
  { feature: "Customizable framework", specwright: "✅", codegen: "❌", saas: "⚠️ limited" },
  { feature: "Reports (Module/Workflows)", specwright: "✅", codegen: "❌", saas: "⚠️" },
  { feature: "Screenshots, traces & videos", specwright: "✅", codegen: "✅", saas: "✅" },
  { feature: "Cost", specwright: "Free", codegen: "Free", saas: "$$$+/mo" },
];

export function ComparisonSection() {
  return (
    <section className="py-24 px-4 bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Why Specwright</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            More than a code generator
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl border border-slate-800 overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-4 text-slate-500 font-medium">Feature</th>
                {/* Specwright header with meteors */}
                <th className="p-4 text-center relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="font-bold text-white">Specwright</p>
                    <p className="text-xs text-blue-400">this project</p>
                  </div>
                  <div className="absolute inset-0 overflow-hidden">
                    <Meteors number={8} />
                  </div>
                </th>
                <th className="p-4 text-center text-slate-400 font-medium">Playwright Codegen</th>
                <th className="p-4 text-center text-slate-400 font-medium">SaaS Tools</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <motion.tr
                  key={row.feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors"
                >
                  <td className="p-4 text-slate-300">{row.feature}</td>
                  <td className="p-4 text-center font-medium text-white bg-slate-900/20">{row.specwright}</td>
                  <td className="p-4 text-center text-slate-400">{row.codegen}</td>
                  <td className="p-4 text-center text-slate-400">{row.saas}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
