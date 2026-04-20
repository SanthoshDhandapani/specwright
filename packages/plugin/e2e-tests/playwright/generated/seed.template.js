import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Seed template — Specwright exploration output
// Auth strategy: email-password (default)
//
// This file is OVERWRITTEN on every /e2e-plan run. The template is always
// restored before exploration so live selector discovery starts from a clean slate.
// Customize the authenticate() function below for your project's auth flow.
// For OAuth projects, replace the body with localStorage injection.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';

test.setTimeout(90000);

async function authenticate(page) {
  if (process.env.AUTH_STRATEGY === 'none') return;
  // Default: email-password — adjust selectors to match your sign-in page
  await page.goto(`${BASE_URL}/signin`);
  await page.getByTestId('login-email').fill(TEST_USER_EMAIL);
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByTestId('login-password').fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
}

// ---------------------------------------------------------------------------
// Test cases below are written from live browser exploration by /e2e-plan.
// Do not edit manually — this section is regenerated on every run.
// ---------------------------------------------------------------------------
