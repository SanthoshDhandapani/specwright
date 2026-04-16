import path from 'path';
import fs from 'fs';
import os from 'os';

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
/**
 * Read persisted Specwright global config from ~/.specwright/config.json.
 * This file is written by e2e_setup when the user provides a project path via the UI.
 * Safe to call at module load — returns {} if the file doesn't exist.
 */
function readGlobalConfig() {
  try {
    const p = path.join(os.homedir(), '.specwright', 'config.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Write a key to ~/.specwright/config.json (merges with existing content).
 * Called by e2e_setup when the user specifies the project path via elicitation.
 */
export function writeGlobalConfig(updates) {
  const dir = path.join(os.homedir(), '.specwright');
  fs.mkdirSync(dir, { recursive: true });
  const existing = readGlobalConfig();
  fs.writeFileSync(
    path.join(dir, 'config.json'),
    JSON.stringify({ ...existing, ...updates }, null, 2),
  );
}

export function getConfig() {
  const globalCfg = readGlobalConfig();

  // Priority: env var (MCP config) → ~/.specwright/config.json → cwd fallback
  // SPECWRIGHT_PROJECT is the canonical env var for Desktop/npx usage.
  // PROJECT_ROOT is the legacy name kept for backwards compatibility.
  const projectRoot = process.env.SPECWRIGHT_PROJECT
    || process.env.PROJECT_ROOT
    || globalCfg.projectRoot
    || ''   // empty string = not configured; tools will detect and ask via elicitation

  ;

  // A project is "Specwright-configured" if it has a .specwright.json at the root.
  // This is the definitive marker that `npx @specwright/plugin init` has been run.
  const projectConfigured = Boolean(projectRoot && fs.existsSync(path.join(projectRoot, '.specwright.json')));

  // Read .env.testing — single source of truth for auth credentials
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

  // Auth config — .env.testing is the canonical source; process.env as fallback
  const authStrategy      = envTesting.AUTH_STRATEGY         || process.env.AUTH_STRATEGY         || '';
  const testUserEmail     = envTesting.TEST_USER_EMAIL        || process.env.TEST_USER_EMAIL        || '';
  const testUserPassword  = envTesting.TEST_USER_PASSWORD     || process.env.TEST_USER_PASSWORD     || '';
  const test2FACode       = envTesting.TEST_2FA_CODE          || process.env.TEST_2FA_CODE          || '';
  const testUserName      = envTesting.TEST_USER_NAME         || process.env.TEST_USER_NAME         || '';
  const testUserPicture   = envTesting.TEST_USER_PICTURE      || process.env.TEST_USER_PICTURE      || '';
  const oauthStorageKey   = envTesting.OAUTH_STORAGE_KEY      || process.env.OAUTH_STORAGE_KEY      || '';
  const oauthSigninPath   = envTesting.OAUTH_SIGNIN_PATH      || process.env.OAUTH_SIGNIN_PATH      || '/signin';
  const oauthButtonTestId = envTesting.OAUTH_BUTTON_TEST_ID   || process.env.OAUTH_BUTTON_TEST_ID   || '';

  return {
    projectRoot,
    projectConfigured,
    baseURL,
    authRequired,
    authData,
    authStrategy,
    testUserEmail,
    testUserPassword,
    test2FACode,
    testUserName,
    testUserPicture,
    oauthStorageKey,
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
