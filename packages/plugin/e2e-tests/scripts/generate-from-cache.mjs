/**
 * Generate the coverage report from the existing monocart cache.
 * Run this when merge-coverage.js OOMs at generate() on a very large suite —
 * the per-scenario cache is already built, so this just renders it (no raw
 * file re-processing).
 *
 *   node --max-old-space-size=16384 --expose-gc e2e-tests/scripts/generate-from-cache.mjs
 */
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const outputDir = path.join(projectRoot, "reports", "coverage");
const ENV_TESTING = path.join(projectRoot, "e2e-tests", ".env.testing");

// Honor COVERAGE_EXCLUDE the same way merge-coverage.js does, so the
// cache-fallback report drops the same noisy paths as a normal merge.
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
  const envSrc = process.env.COVERAGE_EXCLUDE || readEnvFile(ENV_TESTING).COVERAGE_EXCLUDE;
  const patterns = (envSrc || "").split(",").map(p => p.trim()).filter(Boolean);
  if (patterns.length) console.log(`[coverage] COVERAGE_EXCLUDE: ${patterns.join(", ")}`);
  return patterns.map(p => {
    const esc = p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "(.+)").replace(/\*/g, "([^/]+)");
    return new RegExp(esc);
  });
}

const EXCLUDES = buildExcludes();
const isExcluded = relPath => EXCLUDES.some(re => re.test(relPath));

const _existsCache = new Map();
const sourceFilter = sourcePath => {
  if (!sourcePath) return false;
  if (sourcePath.startsWith("webpack://") || sourcePath.startsWith("sources/")) return false;
  if (/\.(scss|sass|css|less|svg|png|jpg|jpeg|gif|woff2?|ttf|eot)(\?|-[a-f0-9]+|$)/i.test(sourcePath)) return false;
  const DROP_MARKERS = ["node_modules/", ".stories.", ".test.", ".spec.", "/__tests__/", "/__mocks__/", "/generated/", "/public/", "/build/"];
  if (DROP_MARKERS.some(m => sourcePath.includes(m))) return false;
  if (!/(^|\/)src\//.test(sourcePath)) return false;
  const rel = sourcePath.replace(/^.*\/(src\/)/, "$1");
  if (isExcluded(rel)) return false;
  if (_existsCache.has(rel)) return _existsCache.get(rel);
  const exists = fs.existsSync(path.join(projectRoot, rel));
  _existsCache.set(rel, exists);
  return exists;
};

const { default: CoverageReport } = await import("monocart-coverage-reports");

console.log("[coverage] Generating report from existing .cache (no raw file re-processing)...");
if (global.gc) global.gc();

const report = new CoverageReport({
  name: "Specwright E2E Coverage",
  outputDir,
  reports: ["v8", "lcovonly", "console-summary"],
  cleanCache: false,
  sourceFilter
});

if (global.gc) global.gc();
await report.generate();
console.log(`[coverage] Done → reports/coverage/index.html`);
