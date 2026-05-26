/**
 * URL resolution helpers — single source of truth for BASE_URL / AUTH_BASE_URL.
 *
 * Single-origin auth (default): getAuthUrl() === getAppUrl().
 * Split-auth (AUTH_BASE_URL set and ≠ BASE_URL):
 *   - getAuthUrl()  → hosted signin host (where auth.setup.js navigates)
 *   - getAppUrl()   → local app host (where tests run, target of storageState
 *                     rewrite, the use.baseURL for non-auth-tests projects)
 *   - isSplitAuth() → true; auth strategies activate the origin rewrite
 *
 * # Why .mjs with a default export?
 *
 * Playwright's TypeScript loader can strip ESM named-export metadata when
 * transforming .js/.mjs helpers imported from setup or test files. The
 * resulting CJS wrapper either:
 *   - reports `does not provide an export named 'X'` at import-validation time
 *   - reports `exports is not defined in ES module scope` if you switch to
 *     namespace imports
 *
 * Default exports survive the transform because there is nothing to validate
 * per-name — `import x from './foo.mjs'` only checks that *something* is
 * exported as default. The .mjs extension additionally tells transformers
 * to treat the file as ESM unconditionally. Consumers destructure at runtime:
 *
 *   import urlConfig from '../url-config.mjs';
 *   const { getAuthUrl, getAppUrl, isSplitAuth } = urlConfig;
 *
 * This pattern is verified across Playwright 1.59.x and 1.60.x.
 */

const DEFAULT_BASE_URL = 'http://localhost:5173';
const stripTrailingSlash = (s) => (s || '').replace(/\/$/, '');

const getAuthUrl = () =>
  stripTrailingSlash(process.env.AUTH_BASE_URL || process.env.BASE_URL || DEFAULT_BASE_URL);

const getAppUrl = () =>
  stripTrailingSlash(process.env.BASE_URL || DEFAULT_BASE_URL);

const isSplitAuth = () => getAuthUrl() !== getAppUrl();

export default { getAuthUrl, getAppUrl, isSplitAuth };
