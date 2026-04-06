import path from 'path';

/**
 * Read environment-based configuration with fallback defaults.
 * Env vars are set in claude_desktop_config.json → env block.
 */
export function getConfig() {
  const projectRoot = process.env.PROJECT_ROOT || path.resolve(process.cwd());
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  const authRequired = process.env.AUTH_REQUIRED !== 'false';

  // Parse AUTH_DATA — single JSON object with all auth data
  let authData = null;
  if (process.env.AUTH_DATA) {
    try {
      authData = JSON.parse(process.env.AUTH_DATA);
    } catch {
      authData = null;
    }
  }

  return {
    projectRoot,
    baseURL,
    authRequired,
    authData,
    instructionsPath: path.join(projectRoot, 'e2e-tests/instructions.js'),
    featuresDir: path.join(projectRoot, 'e2e-tests/features/playwright-bdd'),
    seedFilePath: path.join(projectRoot, 'e2e-tests/playwright/generated/seed.spec.js'),
    plansDir: path.join(projectRoot, 'e2e-tests/plans'),
    authStatePath: path.join(projectRoot, 'e2e-tests/playwright/auth-storage/.auth/user.json'),
    authDataPath: path.join(projectRoot, 'e2e-tests/data/authenticationData.js'),
    agentMemoryDir: path.join(projectRoot, '.claude/agent-memory'),
    reportsDir: path.join(projectRoot, 'reports'),
  };
}
