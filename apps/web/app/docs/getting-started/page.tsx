"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function GettingStartedPage() {
  useEffect(() => {
    // Redirect to GitHub README (temporary until Fumadocs is wired up)
    const timer = setTimeout(() => {
      window.location.href = "https://github.com/specwright/specwright#getting-started";
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-5xl mb-6">📚</div>
        <h1 className="text-3xl font-bold text-white mb-3">Docs coming soon</h1>
        <p className="text-slate-400 mb-6">
          Full documentation is in progress. Redirecting you to the GitHub README in a moment…
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="https://github.com/specwright/specwright#getting-started"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            Go to GitHub →
          </a>
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-500 transition-all"
          >
            ← Back home
          </a>
        </div>
      </motion.div>
    </div>
  );
}
