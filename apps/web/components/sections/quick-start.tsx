"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../ui/cn";

const TABS = ["Plugin CLI", "Desktop App", "Claude Desktop"] as const;
type Tab = typeof TABS[number];

const STEPS: Record<Tab, { title: string; code: string; note?: string }[]> = {
  "Plugin CLI": [
    {
      title: "Install the plugin into your project",
      code: "npx @specwright/plugin init",
      note: "Scaffolds e2e-tests/, playwright.config.ts, agents, skills",
    },
    {
      title: "Configure credentials",
      code: `# e2e-tests/.env.testing
AUTH_STRATEGY=email-password
TEST_USER_EMAIL=you@example.com
TEST_USER_PASSWORD=yourpassword`,
    },
    {
      title: "Describe your first test",
      code: `// e2e-tests/instructions.js
export default [
  {
    moduleName: '@LoginPage',
    category: '@Modules',
    fileName: 'login',
    pageURL: 'http://localhost:3000/login',
    instructions: [
      'Verify login form shows email + password fields',
      'Successful login redirects to /dashboard',
    ],
    explore: true,
    runGeneratedCases: false,
  }
]`,
    },
    {
      title: "Run the pipeline",
      code: "/e2e-automate",
      note: "In Claude Code — starts the 10-phase pipeline",
    },
  ],
  "Desktop App": [
    {
      title: "Download Specwright Desktop",
      code: "# Download for Mac (Apple Silicon / Intel) or Windows\n# github.com/SanthoshDhandapani/specwright/releases",
      note: "Electron app — no separate install needed",
    },
    {
      title: "Open your project",
      code: "# Click 'Open Project' → select your project folder\n# App auto-detects plugin installation",
    },
    {
      title: "Configure auth in Settings panel",
      code: "# Auth tab → fill in email/password or OAuth token\n# All saved to e2e-tests/.env.testing",
    },
    {
      title: "Click 'Run Pipeline'",
      code: "# Visual phase-by-phase output\n# Live agent streaming\n# One-click approval at Phase 6",
    },
  ],
  "Claude Desktop": [
    {
      title: "Install the plugin (scaffolds the skill automatically)",
      code: "npx @specwright/plugin init",
      note: "Installs @specwright/mcp and adds e2e-desktop-automate skill to .claude/skills/",
    },
    {
      title: "Add @specwright/mcp to Claude Desktop config",
      code: `# ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "specwright": {
      "command": "npx",
      "args": ["-y", "@specwright/mcp"],
      "env": { "PROJECT_PATH": "/path/to/your-project" }
    }
  }
}`,
      note: "Replace /path/to/your-project with your actual project root",
    },
    {
      title: "Add the skill to Claude Desktop",
      code: `# The skill is already in .claude/skills/e2e-desktop-automate/
# Open your project folder in Claude Desktop — the skill is auto-discovered

# Available pipeline tools (via @specwright/mcp):
e2e_automate   — Read instructions.js and build pipeline plan
e2e_explore    — Spawn browser exploration agent
e2e_generate   — Spawn BDD + step generator agents
e2e_heal       — Spawn test healer agent
e2e_execute    — Run tests (seed or bdd mode)`,
    },
    {
      title: "Type a natural language prompt — pipeline runs automatically",
      code: `# In Claude Desktop chat (project open):
Generate E2E tests for the login page at http://localhost:3000/login

# Claude Desktop will:
# 1. Load the e2e-desktop-automate skill
# 2. Call @specwright/mcp tools to run the 10-phase pipeline
# 3. Open a browser, explore your app, write BDD tests
# 4. Ask for your approval before generating test files`,
      note: "No /slash command needed — Claude detects the intent and invokes the skill",
    },
  ],
};

export function QuickStartSection() {
  const [activeTab, setActiveTab] = useState<Tab>("Plugin CLI");

  return (
    <section className="py-24 px-4 bg-slate-900/50 border-y border-slate-800">
      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">Quick start</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Up and running in minutes
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-10">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200",
                activeTab === tab
                  ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {STEPS[activeTab].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4"
              >
                {/* Step number */}
                <div className="shrink-0 w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400 mt-1">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium mb-2">{step.title}</p>
                  <div className="rounded-xl bg-slate-900 border border-slate-700/60 overflow-hidden">
                    <pre className="p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed font-mono">
                      <code>{step.code}</code>
                    </pre>
                  </div>
                  {step.note && (
                    <p className="text-xs text-slate-500 mt-1.5 ml-1">{step.note}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <a
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-sky-500 text-white font-semibold text-sm hover:from-violet-500 hover:to-sky-400 transition-all duration-200"
          >
            Read the full guide →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
