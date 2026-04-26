"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../ui/cn";

const TABS = ["Plugin CLI", "Desktop App", "Claude Desktop"] as const;
type Tab = typeof TABS[number];

const BASE_URL = "https://github.com/SanthoshDhandapani/specwright/releases/download/demo-videos-v1";

const VIDEOS: Partial<Record<Tab, { src: string; poster: string; label: string }>> = {
  "Plugin CLI": {
    src: `${BASE_URL}/Cli_Execution.mp4`,
    poster: `${BASE_URL}/cli-thumb.jpg`,
    label: "See the CLI pipeline run end-to-end",
  },
  "Desktop App": {
    src: `${BASE_URL}/Bootstrapping%2BExploration.mp4`,
    poster: `${BASE_URL}/desktop-thumb.jpg`,
    label: "See the Desktop app bootstrap and explore",
  },
  "Claude Desktop": {
    src: `${BASE_URL}/Claude_Desktop_Favourite_Workflow.mp4`,
    poster: `${BASE_URL}/claude-desktop-thumb.jpg`,
    label: "See the full Favorites workflow run in Claude Desktop",
  },
};

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
      note: "Adds /e2e-desktop-automate skill to .claude/skills/ and wires up @specwright/mcp",
    },
    {
      title: "Add @specwright/mcp to Claude Desktop config",
      code: `# 1. Get your Node.js bin path:
$ dirname $(which node)
# → e.g. /Users/you/.nvm/versions/node/v22.x.x/bin

# 2. Add to ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "specwright": {
      "command": "npx",
      "args": ["@specwright/mcp@latest"],
      "env": {
        "PATH": "/Users/you/.nvm/.../bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
      }
    }
  }
}`,
      note: "Paste the dirname output as the first entry in PATH — Claude Desktop needs it to find npx",
    },
    {
      title: "Open your project folder in Claude Desktop",
      code: `# File → Open Folder → select your project root
# Claude Desktop auto-discovers .claude/skills/e2e-desktop-automate/

# Configure your test target in e2e-tests/instructions.js:
export default [{
  moduleName: '@FavoritesWorkflow',
  category: '@Workflows',
  pageURL: 'https://your-app.vercel.app',
  instructions: ['...'],
}];`,
    },
    {
      title: "Run /e2e-desktop-automate — 10-phase pipeline executes",
      code: `# Type in Claude Desktop chat:
/e2e-desktop-automate

# Phases run automatically:
# Phase 4 — Browser opens, explores your app
# Phase 6 — Pauses for your approval
# Phase 7 — Generates .feature + steps.js
# Phase 8 — Runs tests, auto-heals failures
# Phase 10 — Quality score report`,
      note: "Pause at Phase 6 to review the test plan before files are written",
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

            {/* Demo video */}
            {VIDEOS[activeTab] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: STEPS[activeTab].length * 0.08 + 0.1 }}
                className="mt-6"
              >
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">
                  {VIDEOS[activeTab]!.label}
                </p>
                <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900">
                  <video
                    key={VIDEOS[activeTab]!.src}
                    src={VIDEOS[activeTab]!.src}
                    poster={VIDEOS[activeTab]!.poster}
                    controls
                    preload="none"
                    className="w-full"
                  />
                </div>
              </motion.div>
            )}
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
