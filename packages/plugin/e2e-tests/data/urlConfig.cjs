/**
 * URL resolution helpers — CommonJS module (intentional).
 *
 * Why .cjs instead of .mjs / .js?
 *   Playwright's TypeScript loader transforms ESM helpers imported by setup
 *   or test files into a broken CJS wrapper regardless of export shape
 *   (named exports → "does not provide an export named X"; default exports →
 *   "does not provide an export named 'default'"). The transformer leaves
 *   genuine CommonJS modules alone, so we ship this as .cjs with
 *   module.exports. ESM consumers do
 *     `import urlConfig from '../../data/urlConfig.cjs';`
 *   which Node handles via its built-in CJS-to-ESM interop layer.
 *
 * Single-origin auth (default): getAuthUrl() === getAppUrl().
 * Split-auth (AUTH_BASE_URL set and ≠ BASE_URL):
 *   - getAuthUrl() → hosted signin host
 *   - getAppUrl()  → local app host
 *   - isSplitAuth() → true
 */

const DEFAULT_BASE_URL = 'http://localhost:5173';
const stripTrailingSlash = (s) => (s || '').replace(/\/$/, '');

const getAuthUrl = () =>
  stripTrailingSlash(process.env.AUTH_BASE_URL || process.env.BASE_URL || DEFAULT_BASE_URL);

const getAppUrl = () =>
  stripTrailingSlash(process.env.BASE_URL || DEFAULT_BASE_URL);

const isSplitAuth = () => getAuthUrl() !== getAppUrl();

module.exports = { getAuthUrl, getAppUrl, isSplitAuth };
