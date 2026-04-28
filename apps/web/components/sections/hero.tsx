"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Spotlight } from "../ui/spotlight";
import { BackgroundBeams } from "../ui/background-beams";
import { SpecwrightLogo } from "../ui/specwright-logo";

const TAGLINES = [
  "Written for you.",
  "Healed automatically.",
  "Zero SaaS. Zero telemetry.",
  "10 phases. One command.",
];

export function HeroSection() {
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTaglineIdx((i) => (i + 1) % TAGLINES.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:64px_64px]" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      <BackgroundBeams className="opacity-20" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Badge */}
        {/* Product name */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-3">
            <SpecwrightLogo className="h-7 md:h-9 w-auto" />
            <span className="text-2xl md:text-3xl font-bold tracking-widest uppercase bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
              Specwright
            </span>
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight"
        >
          AI-powered E2E tests.
        </motion.h1>

        {/* Cycling tagline */}
        <div className="h-16 flex items-center justify-center">
          <motion.p
            key={taglineIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent"
          >
            {TAGLINES[taglineIdx]}
          </motion.p>
        </div>

        {/* Sub-tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          Specwright explores your app, writes production-grade BDD tests,
          and self-heals failures — all running locally inside Claude Code.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="/docs/getting-started/installation"
            className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-sky-500 text-white font-semibold text-base hover:from-violet-500 hover:to-sky-400 transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-sky-500 blur opacity-0 group-hover:opacity-30 transition-opacity" />
            Get Started →
          </a>
          <a
            href="https://github.com/SanthoshDhandapani/specwright"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 font-semibold text-base hover:border-slate-500 hover:text-white transition-all duration-200"
          >
            View on GitHub ↗
          </a>
          <a
            href="#pipeline"
            className="px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900/40 text-slate-400 font-semibold text-base hover:border-slate-600 hover:text-slate-200 transition-all duration-200"
          >
            See How It Works ↓
          </a>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-slate-500"
        >
          {[
            { label: "Phases", value: "10" },
            { label: "Agents", value: "8" },
            { label: "Skills", value: "7" },
            { label: "BDD format", value: "Gherkin" },
            { label: "License", value: "MIT" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-6 h-10 rounded-full border-2 border-slate-700 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-slate-500" />
        </motion.div>
      </motion.div>
    </div>
  );
}
