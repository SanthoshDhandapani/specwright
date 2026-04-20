"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../ui/cn";

const CARDS = [
  {
    title: "Plugin + CLI",
    subtitle: "For developers & CI",
    icon: "⌨️",
    color: "from-blue-600/20 to-blue-900/10",
    border: "border-blue-500/20 hover:border-blue-500/50",
    glow: "hover:shadow-blue-500/10",
    features: ["npx install into project", "Claude Code CLI", "CI/CD ready", "Full control"],
    command: "npx @specwright/plugin init",
    tag: "Best for: terminal users & CI",
    terminal: true,
  },
  {
    title: "Desktop App",
    subtitle: "Electron GUI",
    icon: "🖥️",
    color: "from-purple-600/20 to-purple-900/10",
    border: "border-purple-500/20 hover:border-purple-500/50",
    glow: "hover:shadow-purple-500/10",
    features: ["Visual phase display", "Live agent output", "Auth config UI", "One-click run"],
    command: "Download for Mac / Windows",
    tag: "Best for: team demos & reviews",
  },
  {
    title: "Claude Desktop",
    subtitle: "MCP Tools",
    icon: "💬",
    color: "from-emerald-600/20 to-emerald-900/10",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    glow: "hover:shadow-emerald-500/10",
    features: ["9 MCP tools", "Natural language", "e2e-desktop-automate skill", "Chat-native flow"],
    command: "Generate E2E tests for /login using Specwright",
    tag: "Best for: Claude Desktop users",
  },
];

export function ThreeWaysSection() {
  return (
    <section className="py-24 px-4 bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">Three interfaces</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            One pipeline, your choice of UI
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Same 10-phase AI pipeline. Install as a CLI plugin, run as a desktop app,
            or invoke via MCP tools in Claude Desktop.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className={cn(
                "relative group rounded-2xl border p-6 bg-gradient-to-b transition-all duration-300 cursor-default flex flex-col",
                card.color,
                card.border,
                `hover:shadow-xl ${card.glow}`
              )}
            >
              {/* Moving border on hover */}
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                "bg-gradient-to-r from-transparent via-white/5 to-transparent"
              )} />

              {/* Icon */}
              <div className="text-4xl mb-4">{card.icon}</div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-1">{card.title}</h3>
              <p className="text-sm text-slate-400 mb-4">{card.subtitle}</p>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {card.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Command block */}
              <div className="rounded-lg bg-slate-900/80 border border-slate-700/50 p-3 font-mono text-xs text-emerald-400">
                {card.terminal && <span className="text-slate-500">$ </span>}
                {card.command}
              </div>

              {/* Tag */}
              <p className="mt-3 text-xs text-slate-500">{card.tag}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
