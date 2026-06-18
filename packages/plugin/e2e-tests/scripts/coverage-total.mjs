#!/usr/bin/env node
/**
 * Total coverage — merge + append multiple coverage runs into one running report.
 *
 * Use this when you want a cumulative picture across more than one run instead
 * of a single run's snapshot: e.g. run only the scenarios you changed, then fold
 * them into the total without re-running everything; or merge E2E coverage with
 * another LCOV source (a second browser project, a unit-test run, etc.).
 *
 * It merges a NEW lcov into a BASELINE lcov (DA hit counts are summed per line,
 * files are unioned) and writes the result — HTML + lcov.info + JSON summary —
 * into a `totalCoverage` directory. Run it repeatedly and the total accumulates.
 *
 * Workflow:
 *   1. Run tests with coverage, then expand to a full-tree lcov:
 *        pnpm test:e2e:coverage
 *        node e2e-tests/scripts/coverage-expand.mjs
 *   2. Fold that run into the total:
 *        node e2e-tests/scripts/coverage-total.mjs
 *      (re-run after each batch — the total grows.)
 *
 * Env overrides (all optional):
 *   BASELINE_LCOV — existing total to append into  (default: reports/totalCoverage/lcov.info)
 *   NEW_LCOV      — the run to fold in             (default: reports/coverage/lcov-full.info)
 *   OUT_DIR       — output directory               (default: reports/totalCoverage)
 *
 * On the first run the baseline won't exist yet — the NEW lcov simply seeds the
 * total. COVERAGE_EXCLUDE (env or .env.testing) and deleted-file filtering apply.
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const resolveIn = (envVar, fallback) =>
  process.env[envVar] ? path.resolve(PROJECT_ROOT, process.env[envVar]) : path.join(PROJECT_ROOT, fallback);

const BASELINE_LCOV = resolveIn("BASELINE_LCOV", "reports/totalCoverage/lcov.info");
const NEW_LCOV      = resolveIn("NEW_LCOV", "reports/coverage/lcov-full.info");
const OUT_DIR       = resolveIn("OUT_DIR", "reports/totalCoverage");

// ── Validate deps ─────────────────────────────────────────────────
let libCoverage, libReport, reports;
try {
  libCoverage = require("istanbul-lib-coverage");
  libReport   = require("istanbul-lib-report");
  reports     = require("istanbul-reports");
} catch {
  console.error("[total] Missing deps — run: pnpm add -D istanbul-lib-coverage istanbul-lib-report istanbul-reports");
  process.exit(1);
}

// ── Exclusion patterns ────────────────────────────────────────────
const ENV_TESTING = path.join(PROJECT_ROOT, "e2e-tests", ".env.testing");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    result[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return result;
}

function buildExcludes() {
  const defaults = ["**/*.test.js", "**/*.spec.js", "**/*.stories.js", "**/setupTests.js"];
  const envSrc = process.env.COVERAGE_EXCLUDE || readEnvFile(ENV_TESTING).COVERAGE_EXCLUDE;
  if (envSrc) defaults.push(...envSrc.split(",").map(p => p.trim()).filter(Boolean));
  return defaults.map(p => {
    const esc = p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "(.+)").replace(/\*/g, "([^/]+)");
    return new RegExp(esc);
  });
}
const EXCLUDES = buildExcludes();
const isExcluded = relPath => EXCLUDES.some(re => re.test(relPath));
const isDeletedFile = relPath =>
  !fs.existsSync(path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath));

// ── LCOV parser ───────────────────────────────────────────────────
function parseLcov(content) {
  const files = {};
  let cur = null;
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      const key = line.slice(3).trim();
      if (!files[key]) files[key] = { lines: {}, fnMap: {}, fns: {}, branches: {} };
      cur = files[key];
    } else if (!cur) {
      continue;
    } else if (line.startsWith("DA:")) {
      const [n, c] = line.slice(3).split(",");
      cur.lines[+n] = (cur.lines[+n] || 0) + Math.max(0, +c);
    } else if (line.startsWith("FN:")) {
      const comma = line.indexOf(",", 3);
      cur.fnMap[line.slice(comma + 1).trim()] = +line.slice(3, comma);
    } else if (line.startsWith("FNDA:")) {
      const comma = line.indexOf(",", 5);
      const name = line.slice(comma + 1).trim();
      cur.fns[name] = (cur.fns[name] || 0) + Math.max(0, +line.slice(5, comma));
    } else if (line.startsWith("BRDA:")) {
      const [lineNo, block, branch, taken] = line.slice(5).split(",");
      const key = `${lineNo}:${block}:${branch}`;
      if (!cur.branches[key]) cur.branches[key] = { lineNo: +lineNo, block: +block, branch: +branch, hits: 0 };
      cur.branches[key].hits += taken === "-" ? 0 : Math.max(0, +taken);
    } else if (line === "end_of_record") {
      cur = null;
    }
  }
  return files;
}

// ── Merge two parsed LCOV maps (union; shared files → sum hits) ───
function clone(data) {
  return {
    lines: { ...data.lines },
    fnMap: { ...data.fnMap },
    fns: { ...data.fns },
    branches: Object.fromEntries(Object.entries(data.branches).map(([k, v]) => [k, { ...v }])),
  };
}
function mergeLcovMaps(a, b) {
  const merged = {};
  for (const [key, data] of Object.entries(a)) merged[key] = clone(data);
  for (const [key, data] of Object.entries(b)) {
    if (!merged[key]) { merged[key] = clone(data); continue; }
    // File in both: only bump hit counts for lines already in the baseline — do
    // NOT add V8-exclusive line numbers (V8 instruments more positions than the
    // expanded lcov; adding them inflates the denominator and drops the %).
    for (const [ln, hits] of Object.entries(data.lines))
      if (Object.prototype.hasOwnProperty.call(merged[key].lines, ln))
        merged[key].lines[ln] = (merged[key].lines[ln] || 0) + hits;
    for (const [name, lineNo] of Object.entries(data.fnMap))
      if (!merged[key].fnMap[name]) merged[key].fnMap[name] = lineNo;
    for (const [name, hits] of Object.entries(data.fns))
      merged[key].fns[name] = (merged[key].fns[name] || 0) + hits;
    for (const [bKey, bData] of Object.entries(data.branches)) {
      if (!merged[key].branches[bKey]) merged[key].branches[bKey] = { ...bData };
      else merged[key].branches[bKey].hits += bData.hits;
    }
  }
  return merged;
}

// ── Build Istanbul CoverageMap (branches excluded to avoid BRDA-doubling on
//    Istanbul lcov round-trips; branch data is written directly below) ──────
function buildCoverageMap(lcovMap) {
  const coverageMap = libCoverage.createCoverageMap({});
  for (const [relPath, data] of Object.entries(lcovMap)) {
    if (isExcluded(relPath) || isDeletedFile(relPath)) continue;
    const absPath = path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath);
    const statementMap = {}, s = {};
    let si = 0;
    for (const [lineNo, hits] of Object.entries(data.lines)) {
      statementMap[si] = { start: { line: +lineNo, column: 0 }, end: { line: +lineNo, column: 1 } };
      s[si++] = hits;
    }
    const fnMap = {}, f = {};
    let fi = 0;
    for (const [name, lineNo] of Object.entries(data.fnMap)) {
      const loc = { start: { line: lineNo, column: 0 }, end: { line: lineNo, column: 1 } };
      fnMap[fi] = { name, decl: loc, loc };
      f[fi] = data.fns[name] ?? 0;
      fi++;
    }
    coverageMap.addFileCoverage(libCoverage.createFileCoverage({
      path: absPath, statementMap, s, fnMap, f, branchMap: {}, b: {},
    }));
  }
  return coverageMap;
}

// ── Write lcov.info directly (bypasses Istanbul's BRDA-doubling reporter) ──
function writeLcovDirect(lcovMap, outPath) {
  const out = [];
  for (const [relPath, data] of Object.entries(lcovMap)) {
    if (isExcluded(relPath) || isDeletedFile(relPath)) continue;
    out.push(`SF:${relPath}`);
    for (const [name, lineNo] of Object.entries(data.fnMap)) out.push(`FN:${lineNo},${name}`);
    for (const [name, hits] of Object.entries(data.fns)) out.push(`FNDA:${hits},${name}`);
    const fnNames = Object.keys(data.fns);
    out.push(`FNF:${fnNames.length}`);
    out.push(`FNH:${fnNames.filter(n => (data.fns[n] || 0) > 0).length}`);
    const branchEntries = Object.values(data.branches);
    for (const br of branchEntries) out.push(`BRDA:${br.lineNo},${br.block},${br.branch},${br.hits}`);
    out.push(`BRF:${branchEntries.length}`);
    out.push(`BRH:${branchEntries.filter(b => b.hits > 0).length}`);
    const lineEntries = Object.entries(data.lines).sort(([a], [b]) => +a - +b);
    for (const [lineNo, hits] of lineEntries) out.push(`DA:${lineNo},${hits}`);
    out.push(`LF:${lineEntries.length}`);
    out.push(`LH:${lineEntries.filter(([, h]) => h > 0).length}`);
    out.push("end_of_record");
  }
  fs.writeFileSync(outPath, out.join("\n") + "\n");
}

// ── Main ──────────────────────────────────────────────────────────
if (!fs.existsSync(NEW_LCOV)) {
  console.error(`[total] New lcov not found: ${path.relative(PROJECT_ROOT, NEW_LCOV)}`);
  console.error("        Run coverage first, then coverage-expand.mjs (or set NEW_LCOV).");
  process.exit(1);
}

// First run: no baseline yet — the new lcov seeds the total.
const baselineMap = fs.existsSync(BASELINE_LCOV) ? parseLcov(fs.readFileSync(BASELINE_LCOV, "utf8")) : {};
const newMap = parseLcov(fs.readFileSync(NEW_LCOV, "utf8"));

console.log(`[total] Baseline : ${fs.existsSync(BASELINE_LCOV) ? path.relative(PROJECT_ROOT, BASELINE_LCOV) : "(none — seeding)"} (${Object.keys(baselineMap).length} files)`);
console.log(`[total] New data : ${path.relative(PROJECT_ROOT, NEW_LCOV)} (${Object.keys(newMap).length} files)`);

const mergedMap = mergeLcovMaps(baselineMap, newMap);
console.log(`[total] Merged unique : ${Object.keys(mergedMap).length} files`);

const coverageMap = buildCoverageMap(mergedMap);
fs.mkdirSync(OUT_DIR, { recursive: true });

const context = libReport.createContext({
  dir: OUT_DIR,
  coverageMap,
  watermarks: { statements: [50, 80], functions: [50, 80], branches: [50, 80], lines: [50, 80] },
});
reports.create("html", { skipEmpty: false }).execute(context);
writeLcovDirect(mergedMap, path.join(OUT_DIR, "lcov.info"));

const summary = coverageMap.getCoverageSummary();
function branchSummary(lcovMap) {
  let total = 0, covered = 0;
  for (const data of Object.values(lcovMap)) {
    const entries = Object.values(data.branches || {});
    total += entries.length;
    covered += entries.filter(b => b.hits > 0).length;
  }
  return { total, covered, skipped: 0, pct: total > 0 ? +(covered / total * 100).toFixed(2) : 0 };
}
const br = branchSummary(mergedMap);

fs.writeFileSync(path.join(OUT_DIR, "coverage-report.json"), JSON.stringify({
  sources: {
    baseline: { files: Object.keys(baselineMap).length, lcov: BASELINE_LCOV },
    new: { files: Object.keys(newMap).length, lcov: NEW_LCOV },
    merged_unique: Object.keys(mergedMap).length,
  },
  totals: { statements: summary.statements, branches: br, functions: summary.functions, lines: summary.lines },
}, null, 2));

console.log(`\n[total] ── Total Coverage ─────────────────────────────`);
console.log(`  Statements : ${summary.statements.pct.toFixed(2)}% (${summary.statements.covered}/${summary.statements.total})`);
console.log(`  Branches   : ${br.pct.toFixed(2)}% (${br.covered}/${br.total})`);
console.log(`  Functions  : ${summary.functions.pct.toFixed(2)}% (${summary.functions.covered}/${summary.functions.total})`);
console.log(`  Lines      : ${summary.lines.pct.toFixed(2)}% (${summary.lines.covered}/${summary.lines.total})`);
console.log(`\n[total] Report → ${path.relative(PROJECT_ROOT, path.join(OUT_DIR, "index.html"))}`);
