import { test as base, createBdd } from 'playwright-bdd';
import { authenticationData } from '../data/authenticationData.js';
import { testConfig as fullTestConfig } from '../data/testConfig.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from e2e-tests/.env.testing (canonical source of truth)
dotenv.config({ path: 'e2e-tests/.env.testing', override: true });
dotenv.config({ override: false });

// Get current directory for resolving test data path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data directory
const testDataDir = path.join(__dirname, './test-data');

// ==================== SCOPED TEST DATA API ====================
// Replaces single globalTestData.json with one file per feature/scope.
// Shared scopes (@cross-feature-data) → flat file at root (e.g., test-data/eobs.json)
// Feature-specific scopes → hierarchical path (e.g., test-data/auth/login.json)

/**
 * Extract module name from feature URI based on directory structure.
 * Single source of truth — imported by global-hooks.js and step files.
 *
 * @param {string} featureUri - Feature file path
 * @returns {string|null} Module name (lowercase)
 *
 * Examples:
 *   "@Workflows/@Authentication/file.feature" → "authentication"
 *   "@Modules/@HomePage/file.feature" → "homepage"
 */
export function extractModuleName(featureUri) {
  if (!featureUri) return null;

  const parts = featureUri.split('/');
  const categoriesWithModules = ['@Workflows', '@Modules'];

  for (const category of categoriesWithModules) {
    const categoryIndex = parts.indexOf(category);
    if (categoryIndex !== -1 && parts[categoryIndex + 1]) {
      return parts[categoryIndex + 1].replace('@', '').toLowerCase();
    }
  }

  return null;
}

/**
 * Convert feature URI to a hierarchical scope path.
 * Strips @-prefixes and .feature extension, joins with "/".
 *
 * @param {string} featureUri - Feature file path
 * @returns {string} Hierarchical scope path
 */
export function featureUriToScopePath(featureUri) {
  const parts = featureUri.split('/');
  const catIdx = parts.findIndex((p) => p === '@Modules' || p === '@Workflows');
  if (catIdx === -1) return parts[parts.length - 1].replace(/\.feature.*$/, '');

  return parts
    .slice(catIdx + 1)
    .map((p) => p.replace(/^@/, '').replace(/\.feature.*$/, ''))
    .filter(Boolean)
    .map((p) => p.toLowerCase().replace(/[^a-z0-9_]+/g, '-'))
    .join('/');
}

/**
 * Derive the data scope for a feature.
 * - @cross-feature-data → flat module name (e.g., "auth")
 * - Otherwise → hierarchical path (e.g., "homepage/navigation")
 *
 * @param {string} featureUri - Feature file path
 * @param {string[]} tags - Test tags array
 * @returns {string} Scope string (used as file path relative to test-data/)
 */
export function deriveDataScope(featureUri, tags = []) {
  const isCrossFeature = tags.some((t) => t.includes('cross-feature-data'));
  if (isCrossFeature) {
    return extractModuleName(featureUri) || 'shared';
  }
  return featureUriToScopePath(featureUri);
}

/**
 * Resolve scope string to absolute file path.
 * @param {string} scope - Scope string (flat or hierarchical with "/")
 * @returns {string} Absolute path to JSON file
 */
function scopeToFilePath(scope) {
  return path.join(testDataDir, `${scope}.json`);
}

/**
 * Load test data for a specific scope.
 * @param {string} scope - Scope string (e.g., "auth" or "homepage/navigation")
 * @returns {Object} Parsed data or empty object
 */
export function loadScopedTestData(scope) {
  const filePath = scopeToFilePath(scope);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Save test data to a scoped file. Creates directories recursively.
 * @param {string} scope - Scope string
 * @param {Object} data - Data to save
 */
export function saveScopedTestData(scope, data) {
  const filePath = scopeToFilePath(scope);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Check if scoped test data file exists.
 * @param {string} scope - Scope string
 * @returns {boolean}
 */
export function scopedTestDataExists(scope) {
  return fs.existsSync(scopeToFilePath(scope));
}

// ==================== FEATURE-LEVEL BROWSER REUSE ====================
// For serial-execution projects, the browser page persists across scenarios
// within the same feature file. A new page is created only when the test
// file changes (i.e., next feature file starts).
//
// Benefits:
// - Page + context created once per feature file (not per scenario)
// - Client-side state (Zustand store, localStorage) persists across scenarios
// - Background steps can skip redundant navigation if already on target page
// - Authentication state persists via storageState on context creation

let _featurePage = null;
let _featureContext = null;
let _lastTestFile = null;

const REUSABLE_PROJECTS = ['serial-execution'];

// Extend base test with custom fixtures
export const test = base.extend({
  authData: async ({}, use) => {
    await use(authenticationData);
  },

  testConfig: async ({}, use) => {
    await use({
      ...fullTestConfig,
      baseUrl: process.env.BASE_URL || fullTestConfig.baseUrl,
      timeout: {
        loadState: 60000,
        elementWait: 10000,
        networkIdle: 15000,
      },
    });
  },

  testData: async ({}, use) => {
    await use({});
  },

  scenarioContext: async ({}, use) => {
    await use({});
  },

  // Feature-level page reuse for serial-execution projects.
  // For these projects, the browser page persists across scenarios within the
  // same feature file. A fresh context + page is created only when testInfo.file changes.
  // All other projects retain standard per-scenario isolation.
  page: async ({ browser }, use, testInfo) => {
    const { viewport, baseURL, storageState, locale, timezoneId, ignoreHTTPSErrors, video } =
      testInfo.project.use || {};
    const contextOptions = {
      viewport,
      baseURL,
      storageState,
      locale,
      timezoneId,
      ignoreHTTPSErrors,
      ...(video && video !== 'off' ? { recordVideo: { dir: testInfo.outputDir } } : {}),
    };

    if (REUSABLE_PROJECTS.includes(testInfo.project.name)) {
      const currentFile = testInfo.file;

      // New feature file → create fresh context + page
      if (currentFile !== _lastTestFile || !_featurePage || _featurePage.isClosed()) {
        if (_featureContext) {
          await _featureContext.close().catch(() => {});
        }
        _featureContext = await browser.newContext(contextOptions);
        _featurePage = await _featureContext.newPage();
        _lastTestFile = currentFile;
        console.log(`[BrowserReuse] New page for: ${currentFile.split('/').slice(-2).join('/')}`);
      } else {
        console.log(`[BrowserReuse] Reusing page for: ${currentFile.split('/').slice(-2).join('/')}`);
      }

      await use(_featurePage);

      // Video attachment for reusable projects: on failure, close the shared
      // context to finalize the video, attach it, then null out refs.
      const retainAll = process.env.RETAIN_VIDEO_ON_SUCCESS === 'true';
      const isFailed = testInfo.status !== testInfo.expectedStatus;
      if (video && video !== 'off' && (isFailed || retainAll)) {
        try {
          const videoObj = _featurePage?.video?.();
          if (videoObj && _featureContext) {
            await _featureContext.close();
            const savedPath = testInfo.outputPath('video.webm');
            await videoObj.saveAs(savedPath);
            await testInfo.attach('video', { path: savedPath, contentType: 'video/webm' });
          }
        } catch (err) {
          console.log(`[Video][BrowserReuse] Could not attach video: ${err.message}`);
        }
        _featurePage = null;
        _featureContext = null;
        _lastTestFile = null;
      }
    } else {
      // Default: fresh context + page per scenario (standard Playwright behavior)
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();
      await use(page);

      const videoObj = video && video !== 'off' ? page.video() : null;
      await context.close();

      const retainAll = process.env.RETAIN_VIDEO_ON_SUCCESS === 'true';
      const isFailed = testInfo.status !== testInfo.expectedStatus;
      if (videoObj && (isFailed || retainAll)) {
        try {
          const savedPath = testInfo.outputPath('video.webm');
          await videoObj.saveAs(savedPath);
          await testInfo.attach('video', { path: savedPath, contentType: 'video/webm' });
        } catch (err) {
          console.log(`[Video] Could not attach video: ${err.message}`);
        }
      }
    }
  },
});

// Create BDD functions with custom fixtures
export const { Given, When, Then, Before, After, BeforeAll, AfterAll } = createBdd(test);

// Export expect from Playwright
export { expect } from '@playwright/test';
