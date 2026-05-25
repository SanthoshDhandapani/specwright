/**
 * Global Teardown — runs once after all test projects complete.
 * - Removes the .cleanup-done marker so the next run starts fresh.
 * - When ENABLE_COVERAGE=true: merges all raw V8 coverage files into ONE report.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const markerFile = path.join(__dirname, '.cleanup-done');

/**
 * Walk src/ and build a map: basename → full relative path.
 * Vite dev source maps often emit just basenames (e.g. "ListCard.tsx"),
 * losing the directory structure. This map lets us reconstruct paths
 * like "src/components/lists/ListCard.tsx" in the coverage report.
 *
 * Handles duplicates by keeping the LAST match (rare in practice).
 */
function buildSrcPathMap(rootDir = 'src') {
  const map = {};
  if (!fs.existsSync(rootDir)) return map;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(full);
      } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name)) {
        map[entry.name] = full;
      }
    }
  };
  walk(rootDir);
  return map;
}

async function generateMergedCoverage() {
  const rawDir = '.raw-coverage';
  if (!fs.existsSync(rawDir)) {
    console.log('[coverage] No raw coverage data — skipping merged report.');
    return;
  }
  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('[coverage] Raw coverage directory empty — skipping merged report.');
    return;
  }

  const { CoverageReport } = await import('monocart-coverage-reports');

  // Build basename → full path lookup so the report tree matches src/ structure
  const srcMap = buildSrcPathMap('src');
  console.log(`[coverage] Indexed ${Object.keys(srcMap).length} source files for path mapping.`);

  // ─── Coverage Exclusions ─────────────────────────────────────────────────
  // Add patterns here to exclude files/directories from coverage measurement.
  // Each entry is a substring or RegExp tested against the resolved sourcePath.
  // Can also be supplied via COVERAGE_EXCLUDE env var (comma-separated).
  //
  // Examples:
  //   'src/legacy/'                  — exclude a directory
  //   '.stories.'                    — exclude all Storybook files
  //   '/__mocks__/'                  — exclude mocks
  //   /\.types\.tsx?$/               — regex: exclude *.types.ts/tsx
  //   'src/generated/'               — exclude codegen output
  const DEFAULT_EXCLUDES = [
    // Build artifacts
    'node_modules',
    '/dist/',
    '/build/',
    // Virtual / generated modules
    'virtual:',
    // Tests, specs, mocks, stories
    /\.test\.(tsx?|jsx?)$/,
    /\.spec\.(tsx?|jsx?)$/,
    /\.stories\.(tsx?|jsx?)$/,
    '/__mocks__/',
    '/__tests__/',
    // Type-only files (no runtime code to measure)
    /\.d\.ts$/,
    // Non-JS resources
    /\.css$/,
    /\.scss$/,
    // External hosts (e.g. accounts.google.com)
    /^[a-z0-9.-]+\.[a-z]{2,}\//i,
    // Localhost pseudo-paths (HTML, etc.)
    /^localhost[-:]/,
  ];

  const envExcludes = (process.env.COVERAGE_EXCLUDE || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const ALL_EXCLUDES = [...DEFAULT_EXCLUDES, ...envExcludes];

  const isExcluded = (p) => {
    if (!p) return true;
    return ALL_EXCLUDES.some((rule) =>
      typeof rule === 'string' ? p.includes(rule) : rule.test(p),
    );
  };

  const report = new CoverageReport({
    name: 'Specwright E2E Code Coverage',
    outputDir: 'reports/coverage',
    // Filter served scripts — keep only app JS/TS from the local origin
    entryFilter: (entry) => {
      const url = entry.url || '';
      // Drop entries that aren't from our app origin (Google OAuth, third-party widgets)
      if (!url.startsWith('http://localhost') && !url.startsWith('https://localhost')) return false;
      // Drop vendor / dev-server internals
      if (url.includes('node_modules')) return false;
      if (url.includes('/@vite/')) return false;
      if (url.includes('/@fs/')) return false;
      if (url.includes('/@react-refresh')) return false;
      // Drop non-JS resources (HTML pages, CSS — coverage tracks JS only)
      const path = url.split('?')[0];
      const isHtmlPath = !path.match(/\.(js|jsx|ts|tsx|mjs|cjs)$/) && !path.includes('/src/');
      if (isHtmlPath) return false;
      if (path.endsWith('.css')) return false;
      return true;
    },
    // Filter source-mapped files — apply unified EXCLUDES list above
    sourceFilter: (sourcePath) => !isExcluded(sourcePath || ''),
    reports: [
      ['v8'],
      ['console-summary'],
      ['lcov'],
      ['v8-json'],
    ],
    // Normalize source paths — reconstruct full src/ tree from basenames.
    // Vite dev source maps drop the directory structure; we look up the
    // basename in srcMap (built from walking the actual src/ tree) and
    // substitute the real path.
    sourcePath: (filePath) => {
      // Skip non-app paths (already-correct paths, node_modules, etc.)
      if (filePath.startsWith('src/')) return filePath;
      if (filePath.includes('node_modules')) return filePath;
      // Try to resolve basename → full src/ path
      const basename = filePath.split('/').pop();
      if (srcMap[basename]) return srcMap[basename];
      // Fallback: prepend src/ for .tsx/.ts/.jsx/.js if it has no directory
      if (!filePath.includes('/') && /\.(tsx?|jsx?)$/.test(filePath)) {
        return `src/${filePath}`;
      }
      return filePath;
    },
    clean: true,
  });

  console.log(`[coverage] Merging ${files.length} raw coverage files...`);
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'));
    await report.add(data);
  }
  const summary = await report.generate();
  console.log(`[coverage] Merged report → reports/coverage/index.html`);
  console.log(`[coverage] Summary: ${summary.summary.lines.pct.toFixed(1)}% lines covered`);

  // Clean up raw files
  fs.rmSync(rawDir, { recursive: true, force: true });
}

export default async function globalTeardown() {
  console.log('[global.teardown] Starting global teardown...');

  if (fs.existsSync(markerFile)) {
    fs.unlinkSync(markerFile);
    console.log('[global.teardown] Marker file removed.');
  }

  if (process.env.ENABLE_COVERAGE === 'true') {
    try {
      await generateMergedCoverage();
    } catch (err) {
      console.log(`[coverage] Merge failed: ${err.message}`);
    }
  }

  console.log('[global.teardown] Teardown complete.');
}
