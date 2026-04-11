import path from 'path';
import fs from 'fs';

/**
 * Parse a .env file into a key-value map (no shell expansion, no quoting rules).
 * Lines starting with # are comments. Empty lines are skipped.
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

/**
 * Read environment-based configuration with fallback defaults.
 * Env vars are set in claude_desktop_config.json → env block for Desktop.
 * For CLI, OAuth fields are read directly from e2e-tests/.env.testing.
 */
export function getConfig() {
  const projectRoot = process.env.PROJECT_ROOT || path.resolve(process.cwd());

  // Read .env.testing — OAuth fields won't be in process.env for CLI runs
  const envTestingPath = path.join(projectRoot, 'e2e-tests/.env.testing');
  const envTesting = parseEnvFile(envTestingPath);

  const baseURL = process.env.BASE_URL || envTesting.BASE_URL || 'http://localhost:5173';
  const authRequired = process.env.AUTH_REQUIRED !== 'false';

  // Parse AUTH_DATA — single JSON object with all auth data (Desktop only)
  let authData = null;
  if (process.env.AUTH_DATA) {
    try {
      authData = JSON.parse(process.env.AUTH_DATA);
    } catch {
      authData = null;
    }
  }

  // OAuth config — .env.testing takes precedence for CLI, process.env for Desktop
  const authStrategy    = envTesting.AUTH_STRATEGY      || process.env.AUTH_STRATEGY      || '';
  const oauthStorageKey = envTesting.OAUTH_STORAGE_KEY  || process.env.OAUTH_STORAGE_KEY  || '';
  const testUserEmail   = envTesting.TEST_USER_EMAIL     || process.env.TEST_USER_EMAIL    || '';
  const testUserName    = envTesting.TEST_USER_NAME      || process.env.TEST_USER_NAME     || '';
  const testUserPicture = envTesting.TEST_USER_PICTURE   || process.env.TEST_USER_PICTURE  || '';
  const oauthSigninPath = envTesting.OAUTH_SIGNIN_PATH   || process.env.OAUTH_SIGNIN_PATH  || '/signin';
  const oauthButtonTestId = envTesting.OAUTH_BUTTON_TEST_ID || process.env.OAUTH_BUTTON_TEST_ID || '';

  return {
    projectRoot,
    baseURL,
    authRequired,
    authData,
    authStrategy,
    oauthStorageKey,
    testUserEmail,
    testUserName,
    testUserPicture,
    oauthSigninPath,
    oauthButtonTestId,
    instructionsPath:  path.join(projectRoot, 'e2e-tests/instructions.js'),
    featuresDir:       path.join(projectRoot, 'e2e-tests/features/playwright-bdd'),
    seedFilePath:      path.join(projectRoot, 'e2e-tests/playwright/generated/seed.spec.js'),
    plansDir:          path.join(projectRoot, 'e2e-tests/plans'),
    authStatePath:     path.join(projectRoot, 'e2e-tests/playwright/auth-storage/.auth/user.json'),
    authDataPath:      path.join(projectRoot, 'e2e-tests/data/authenticationData.js'),
    agentMemoryDir:    path.join(projectRoot, '.claude/agent-memory'),
    reportsDir:        path.join(projectRoot, 'reports'),
  };
}
