/**
 * Source-map capture/attach for E2E V8 coverage (DYFN-12683).
 *
 * page.coverage.stopJSCoverage() returns { url, source, functions } but NO
 * source map. CRA / webpack serves external .map files from the dev server's
 * memory (not on disk), so an offline merge can't fetch them — monocart then
 * falls back to bundle-chunk URLs instead of real src/ paths.
 *
 * Fix: while the dev server is alive (during the test run), fetch each
 * script's source map ONCE and store it in .raw-coverage/.maps/ keyed by URL.
 * The merge step (teardown or standalone) attaches the stored map to each
 * entry so monocart resolves to src/ paths offline.
 *
 * Bundlers that emit INLINE source maps (e.g. Vite dev server) already embed
 * the map as a data: URI — monocart handles those without help from us.
 */
import fs from "fs";
import path from "path";

const mapKey = url => encodeURIComponent(url).replace(/%/g, "_");

// Per-process dedup — the same chunk appears in every scenario; fetch once.
const _saved = new Set();

/**
 * Fetch and persist the source map for a V8 coverage entry (best-effort).
 * Must be called while the dev server is still alive (from the Playwright fixture).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{url?: string, source?: string}} entry
 * @param {string} mapsDir  absolute path to .raw-coverage/.maps
 */
export async function saveSourceMap(page, entry, mapsDir) {
  try {
    const url = entry?.url || "";
    if (!/^https?:\/\//.test(url)) return;
    const key = mapKey(url);
    if (_saved.has(key)) return;
    const file = path.join(mapsDir, `${key}.json`);
    if (fs.existsSync(file)) { _saved.add(key); return; }

    const matches = [...(entry.source || "").matchAll(/\/\/[#@]\s*sourceMappingURL=(\S+)/g)];
    if (!matches.length) return;
    const ref = matches[matches.length - 1][1];
    if (ref.startsWith("data:")) return; // inline — monocart resolves offline already

    const mapUrl = new URL(ref, url).href;
    const res = await page.request.get(mapUrl);
    if (!res.ok()) return;
    fs.mkdirSync(mapsDir, { recursive: true });
    fs.writeFileSync(file, await res.text());
    _saved.add(key);
  } catch {
    // best-effort: missing map means that script stays as a bundle chunk
  }
}

/**
 * Attach a previously-captured source map to a V8 coverage entry so monocart
 * resolves it to original src/ paths offline.
 * No-op if no map was captured or entry already has one.
 *
 * @param {{url?: string, sourceMap?: object}} entry
 * @param {string} mapsDir  absolute path to .raw-coverage/.maps
 * @returns the same entry (mutated in place)
 */
export function attachSourceMap(entry, mapsDir) {
  if (!entry || entry.sourceMap || !entry.url) return entry;
  try {
    const file = path.join(mapsDir, `${mapKey(entry.url)}.json`);
    if (fs.existsSync(file)) {
      entry.sourceMap = JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch { /* leave unmapped */ }
  return entry;
}
