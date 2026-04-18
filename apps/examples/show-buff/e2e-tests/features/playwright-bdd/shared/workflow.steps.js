/**
 * Shared workflow steps — reusable across all @Workflows features.
 * Lives in shared/ (no @-prefix) so it is globally scoped.
 *
 * Provides the "I load predata from" step used by consumer phases to
 * hydrate page.testData from a file-backed scoped JSON written by the
 * precondition phase. Polls the scope file for up to 60 seconds to tolerate
 * a race with a just-finishing precondition phase.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Given } from '../../../playwright/fixtures.js';
import { loadScopedTestData, scopedTestDataExists } from '../../../playwright/fixtures.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// testDataDir resolves from e2e-tests/features/playwright-bdd/shared/ → e2e-tests/playwright/test-data/
const testDataDir = path.join(__dirname, '../../../playwright/test-data');

/**
 * Poll for the scope file to exist, with timeout.
 * Returns true when file exists, false if the timeout expires.
 */
async function waitForScopeFile(scope, timeoutMs = 60000, intervalMs = 1000) {
  const filePath = path.join(testDataDir, `${scope}.json`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return fs.existsSync(filePath);
}

Given('I load predata from {string}', async ({ page, testData }, scope) => {
  if (!scopedTestDataExists(scope)) {
    const appeared = await waitForScopeFile(scope);
    if (!appeared) {
      console.log(
        `[workflow] predata scope "${scope}" not found after 60s — consumer will proceed with empty predata`,
      );
      return;
    }
  }

  const data = loadScopedTestData(scope);

  // Hydrate scenario-scoped testData
  Object.assign(testData, data);

  // Hydrate in-memory feature cache so downstream helpers can read <from_test_data>
  if (!globalThis.__rt_featureDataCache) {
    globalThis.__rt_featureDataCache = {};
  }
  globalThis.__rt_featureDataCache[scope] = {
    ...(globalThis.__rt_featureDataCache[scope] || {}),
    ...data,
  };

  // Track scope on the page for later saves (consumer-intermediate phases)
  page.__workflowScope = scope;

  // If the predata contains localStorage keys, restore them BEFORE any page script runs.
  // This uses page.addInitScript so app code sees the restored state on first read.
  if (data && data.localStorage && Object.keys(data.localStorage).length > 0) {
    await page.addInitScript((snap) => {
      try {
        for (const [key, value] of Object.entries(snap)) {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }
      } catch (err) {
        // SecurityError on about:blank etc. — first real navigation triggers retry
        console.log('[workflow] addInitScript restore failed:', err);
      }
    }, data.localStorage);
  }
});
