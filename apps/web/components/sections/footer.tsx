"use client";
import React from "react";

export function Footer() {
  return (
    <footer className="py-12 px-4 bg-slate-950 border-t border-slate-800">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <p className="text-white font-semibold mb-3">Specwright</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              AI-powered E2E test automation.<br />
              Open source · MIT License.
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Docs</p>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="/docs/getting-started" className="hover:text-slate-300 transition-colors">Getting Started</a></li>
              <li><a href="/docs/core-concepts/10-phase-pipeline" className="hover:text-slate-300 transition-colors">10-Phase Pipeline</a></li>
              <li><a href="/docs/reference/agents" className="hover:text-slate-300 transition-colors">Agents Reference</a></li>
              <li><a href="/docs/reference/field-types" className="hover:text-slate-300 transition-colors">Field Types</a></li>
            </ul>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Examples</p>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="/docs/examples/show-buff" className="hover:text-slate-300 transition-colors">Show-Buff Demo</a></li>
              <li><a href="/docs/examples/workflow-tests" className="hover:text-slate-300 transition-colors">Workflow Tests</a></li>
              <li><a href="/docs/advanced/custom-agents" className="hover:text-slate-300 transition-colors">Custom Agents</a></li>
            </ul>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Links</p>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="https://github.com/SanthoshDhandapani/specwright" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">GitHub ↗</a></li>
              <li><a href="/changelog" className="hover:text-slate-300 transition-colors">Changelog</a></li>
              <li><a href="https://github.com/SanthoshDhandapani/specwright/issues" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">Report Issue ↗</a></li>
            </ul>
          </div>
        </div>

        {/* Platform strip + CTAs */}
        <div className="border-t border-slate-800 pt-10 pb-8 flex flex-col items-center gap-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Available on</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 text-sm">
              <span>🤖</span>
              <span>Claude Code</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 text-sm">
              <span>🖥️</span>
              <span>Specwright Desktop</span>
              <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1">Mac · Windows</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 text-sm">
              <span>💬</span>
              <span>Claude Desktop</span>
              <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1">+ skill</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <a
              href="/docs/getting-started"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-sky-500 text-white text-sm font-semibold hover:from-violet-500 hover:to-sky-400 transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              Get Started →
            </a>
            <a
              href="https://github.com/SanthoshDhandapani/specwright"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-all duration-200"
            >
              View on GitHub ↗
            </a>
            <a
              href="#pipeline"
              className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-900/40 text-slate-400 text-sm font-semibold hover:border-slate-600 hover:text-slate-200 transition-all duration-200"
            >
              See How It Works ↓
            </a>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Specwright. MIT License.
          </p>
          <p className="text-xs text-slate-600">
            Powered by{" "}
            <a href="https://playwright.dev" className="text-slate-500 hover:text-slate-400">Playwright</a>
            {" "}+{" "}
            <a href="https://github.com/vitalets/playwright-bdd" className="text-slate-500 hover:text-slate-400">playwright-bdd</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
