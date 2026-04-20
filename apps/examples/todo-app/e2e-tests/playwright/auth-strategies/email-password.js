/**
 * Auth Strategy: Email + Password — @specwright/plugin-mui override
 *
 * Single-form login (both fields on one page) — for apps that don't use
 * a two-step email → password flow. Both fields are visible simultaneously.
 *
 * Reads credentials from env vars:
 *   TEST_USER_EMAIL     — login email
 *   TEST_USER_PASSWORD  — login password
 *
 * Reads locators from authenticationData.js (testIds must match the app):
 *   locators.emailInput.testId       — e.g. 'input-email'
 *   locators.passwordInput.testId    — e.g. 'input-password'
 *   locators.loginSubmitButton.testId — e.g. 'btn-signin'
 *
 * After success: waits for URL to contain /todos (or /home), saves storageState.
 */
import { authenticationData } from '../../data/authenticationData.js';

export async function authenticate(page, authFile, _config = {}) {
  console.log('[auth:email-password:mui] Starting authentication...');

  const { validCredentials, locators, timeouts } = authenticationData;

  // Navigate to sign-in page
  await page.goto(`${authenticationData.baseUrl}/signin`);
  await page.waitForLoadState('networkidle', { timeout: timeouts.loadState });

  // Fill both fields (single-form — both visible at once)
  const emailInput = page.getByTestId(locators.emailInput.testId);
  await emailInput.waitFor({ state: 'visible', timeout: timeouts.elementWait });
  await emailInput.fill(validCredentials.email);

  const passwordInput = page.getByTestId(locators.passwordInput.testId);
  await passwordInput.fill(validCredentials.password);
  console.log(`[auth:email-password:mui] Filled email + password`);

  // Submit — single button (no two-step)
  const submitButton = page.getByTestId(locators.loginSubmitButton.testId);
  await submitButton.click();
  console.log('[auth:email-password:mui] Clicked sign in');

  // Wait for redirect — MUI apps typically land on /todos or /home or /dashboard
  await page.waitForURL(/\/(todos|home|dashboard)/, { timeout: timeouts.login });
  await page.waitForLoadState('networkidle', { timeout: timeouts.loadState });
  console.log('[auth:email-password:mui] Login successful');

  // Save authentication state (localStorage token + cookies)
  await page.context().storageState({ path: authFile });
  console.log(`[auth:email-password:mui] State saved to: ${authFile}`);
}
