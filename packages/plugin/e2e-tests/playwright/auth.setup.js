/**
 * Authentication Setup — two-step localStorage login
 *
 * Flow:
 * 1. Navigate to /signin
 * 2. Fill email → click email submit
 * 3. Wait for password field → fill password → click login submit
 * 4. Handle 2FA if twoFactorCodeInput appears
 * 5. Wait for redirect to /home
 * 6. Save storageState (captures localStorage auth tokens)
 *
 * Update authenticationData.js with your app's login form testIDs and credentials.
 */
import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticationData } from '../data/authenticationData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, './auth-storage/.auth/user.json');

setup('authenticate', async ({ page }) => {
  console.log('Starting authentication setup...');

  const { validCredentials, locators, timeouts, twoFactor } = authenticationData;

  // Step 1: Navigate to sign-in page
  await page.goto(`${authenticationData.baseUrl}/signin`);
  await page.waitForLoadState('networkidle', { timeout: timeouts.loadState });
  console.log('Navigated to /signin');

  // Step 2: Fill email and submit
  const emailInput = page.getByTestId(locators.emailInput.testId);
  await emailInput.waitFor({ state: 'visible', timeout: timeouts.elementWait });
  await emailInput.fill(validCredentials.email);
  console.log(`Filled email: ${validCredentials.email}`);

  const emailSubmit = page.getByTestId(locators.emailSubmitButton.testId);
  await emailSubmit.click();
  console.log('Clicked email submit');

  // Step 3: Wait for password field, fill, and submit
  const passwordInput = page.getByTestId(locators.passwordInput.testId);
  await passwordInput.waitFor({ state: 'visible', timeout: timeouts.elementWait });
  await passwordInput.fill(validCredentials.password);
  console.log('Filled password');

  const loginSubmit = page.getByTestId(locators.loginSubmitButton.testId);
  await loginSubmit.click();
  console.log('Clicked login submit');

  // Step 4: Handle 2FA if it appears
  try {
    const twoFactorInput = page.getByTestId(twoFactor.locators.codeInput.testId);
    await twoFactorInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('2FA detected, entering code...');
    await twoFactorInput.fill(twoFactor.code);
    const proceedButton = page.getByTestId(twoFactor.locators.proceedButton.testId);
    await proceedButton.click();
    console.log('2FA code submitted');
  } catch {
    // No 2FA prompt — expected for most test accounts
    console.log('No 2FA prompt detected, continuing...');
  }

  // Step 5: Wait for redirect to /home
  await page.waitForURL('**/home**', { timeout: timeouts.login });
  await page.waitForLoadState('networkidle', { timeout: timeouts.loadState });
  console.log('Login successful — redirected to /home');

  // Step 6: Save authentication state (captures localStorage)
  await page.context().storageState({ path: authFile });
  console.log(`Authentication state saved to: ${authFile}`);
});
