#!/usr/bin/env node
/**
 * Extend reports/coverage/lcov.info with zero-coverage entries for every
 * src/ file that wasn't loaded by any test. The extended report shows the
 * REAL coverage picture (covered + uncovered files side by side).
 *
 * Output: reports/coverage/lcov-full.info
 *
 * View options (pick one):
 *   1. VS Code: install "Coverage Gutters" → open the extended lcov
 *      → see uncovered files in the file tree with red highlights
 *   2. genhtml (if installed via `brew install lcov`):
 *        genhtml reports/coverage/lcov-full.info -o reports/coverage-full
 *   3. Codecov / SonarQube ingestion (CI flows)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Anchor to the script's own location (two levels up from e2e-tests/scripts/)
// so PROJECT_ROOT is correct regardless of the cwd the script is invoked from.
// fileURLToPath (not `new URL().pathname`) handles Windows drive paths and
// percent-encoded characters (e.g. spaces) correctly.
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENV_TESTING = path.join(PROJECT_ROOT, "e2e-tests", ".env.testing");

// Paths are env-overridable so CI / alternate merge flows can redirect them.
const LCOV_IN = process.env.LCOV_IN || "reports/coverage/lcov.info";
const LCOV_OUT = process.env.LCOV_OUT || "reports/coverage/lcov-full.info";

// Minimal .env reader (no dotenv dependency) for standalone runs.
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

const env = readEnvFile(ENV_TESTING);

// Source roots to index — supports Next.js App Router (`app`), monorepos, or
// multi-root layouts (`src,lib`). Mirrors COVERAGE_SOURCE_ROOTS in .env.testing.
const SRC_ROOTS = (process.env.COVERAGE_SOURCE_ROOTS || env.COVERAGE_SOURCE_ROOTS || "src")
  .split(",").map(s => s.trim()).filter(Boolean);

// COVERAGE_EXCLUDE — comma-separated glob/substring patterns (shell env wins).
function buildExcludes() {
  const envSrc = process.env.COVERAGE_EXCLUDE || env.COVERAGE_EXCLUDE;
  const patterns = (envSrc || "").split(",").map(p => p.trim()).filter(Boolean);
  if (patterns.length) console.log(`COVERAGE_EXCLUDE: ${patterns.join(", ")}`);
  return patterns.map(p => {
    const esc = p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "(.+)").replace(/\*/g, "([^/]+)");
    return new RegExp(esc);
  });
}
const USER_EXCLUDES = buildExcludes();
const isExcluded = p => USER_EXCLUDES.some(re => re.test(p));

if (!fs.existsSync(LCOV_IN)) {
  console.error(`No coverage report at ${LCOV_IN}. Run 'pnpm test:e2e:coverage' first.`);
  process.exit(1);
}

// Read existing lcov and harvest the SF: paths, normalized to project-root-
// relative so they compare cleanly against the on-disk walk() output below.
const lcov = fs.readFileSync(LCOV_IN, "utf8");
const covered = new Set();
for (const line of lcov.split("\n")) {
  if (!line.startsWith("SF:")) continue;
  let p = line.slice(3).trim();
  if (path.isAbsolute(p)) p = path.relative(PROJECT_ROOT, p);
  covered.add(p);
}

// Walk source root(s) on disk
function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/(__tests__|__mocks__|node_modules)/.test(p)) continue;
      yield* walk(p);
    } else if (/\.(jsx?|tsx?)$/.test(e.name) && !/\.(test|spec|stories)\./.test(e.name)) {
      yield p;
    }
  }
}

const untouched = [];
for (const root of SRC_ROOTS) {
  for (const f of walk(root)) {
    if (!covered.has(f) && !isExcluded(f)) untouched.push(f);
  }
}

console.log(`Existing lcov files:   ${covered.size}`);
console.log(`Untouched files added: ${untouched.length}`);

// For each untouched file, emit an SF block with DA:N,0 for every "code-ish"
// line. A code-ish line skips blanks/comments/imports so the LF count is
// realistic. Anything that looks like a statement counts.
function codeLineNumbers(source) {
  const lines = source.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("*/")) continue;
    if (t === "{" || t === "}" || t === "};" || t === "}," || t === ");" || t === "(" || t === ")") continue;
    out.push(i + 1);
  }
  return out;
}

let extra = "";
for (const f of untouched) {
  const src = fs.readFileSync(f, "utf8");
  const lines = codeLineNumbers(src);
  if (lines.length === 0) continue;
  extra += `TN:\nSF:${f}\n`;
  for (const n of lines) extra += `DA:${n},0\n`;
  extra += `LF:${lines.length}\nLH:0\nBRF:0\nBRH:0\nFNF:0\nFNH:0\nend_of_record\n`;
}

fs.writeFileSync(LCOV_OUT, lcov + extra);
console.log(`Wrote ${LCOV_OUT}`);

// Quick summary using the extended lcov
function sumField(text, field) {
  let s = 0;
  for (const line of text.split("\n"))
    if (line.startsWith(field + ":")) s += +line.slice(field.length + 1);
  return s;
}
const fullText = fs.readFileSync(LCOV_OUT, "utf8");
const lf = sumField(fullText, "LF");
const lh = sumField(fullText, "LH");
const filesInExt = (fullText.match(/^SF:/gm) || []).length;
console.log("");
console.log(`Files in extended report: ${filesInExt}`);
console.log(`Lines instrumented:       ${lf.toLocaleString()}`);
console.log(`Lines hit:                ${lh.toLocaleString()}`);
console.log(`Full-tree line coverage:  ${(lh / lf * 100).toFixed(2)}%`);
console.log("");
console.log("View options:");
console.log("  • VS Code: install 'Coverage Gutters', point it at lcov-full.info");
console.log("  • HTML:    brew install lcov && genhtml reports/coverage/lcov-full.info -o reports/coverage-full");
