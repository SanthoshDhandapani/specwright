import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Seed template — ShowBuff OAuth (localStorage injection)
// Auth strategy: oauth | OAUTH_STORAGE_KEY=specwright-show-user
//
// This file is OVERWRITTEN on every /e2e-plan run. The pre-cleanup step
// copies this to e2e-tests/playwright/generated/seed.spec.js before exploration.
// Customize this file if the ShowBuff auth shape changes.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL || 'https://specwright-show-buff.vercel.app';
const OAUTH_STORAGE_KEY = process.env.OAUTH_STORAGE_KEY; // NO fallback — fail loud if missing
const TEST_USER_NAME = process.env.TEST_USER_NAME || '';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PICTURE = process.env.TEST_USER_PICTURE || '';

test.setTimeout(90000);

async function authenticate(page) {
  await page.goto(BASE_URL);
  await page.evaluate(({ key, user }) => {
    localStorage.setItem(key, JSON.stringify(user));
  }, {
    key: OAUTH_STORAGE_KEY,
    user: { name: TEST_USER_NAME, email: TEST_USER_EMAIL, picture: TEST_USER_PICTURE }
  });
  await page.goto(BASE_URL);
}

// ---------------------------------------------------------------------------
// Test cases below are written from live browser exploration by /e2e-plan.
// Do not edit manually — this section is regenerated on every run.
// ---------------------------------------------------------------------------
