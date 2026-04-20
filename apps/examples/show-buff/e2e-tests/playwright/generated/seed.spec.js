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
//
// Live exploration refs (session-unique, from browser_snapshot responses):
// Overview ref: e3  (home page root)
// Module: @FavoritesWorkflow
// Page URL: https://specwright-show-buff.vercel.app/home
// ---------------------------------------------------------------------------

test.describe('@FavoritesWorkflow — Add to Favorites and Verify', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  // -------------------------------------------------------------------------
  // TC1: Navigate to home, click a show card, open detail page
  // -------------------------------------------------------------------------
  test('TC1: Home page shows show cards with links to detail pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);

    // Page heading visible
    await expect(page.getByRole('heading', { name: 'Top TV Shows' })).toBeVisible();

    // Show card is visible and links to detail page
    const showCard = page.getByTestId('show-card-28276'); // The Witcher
    await expect(showCard).toBeVisible();

    // Card has title
    await expect(page.getByTestId('show-card-title-28276')).toBeVisible();

    // Click show card to navigate to detail page
    await showCard.click();
    await expect(page).toHaveURL(/\/show\/28276/);
    await expect(page.getByTestId('page-show-detail')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // TC2: Show detail page has Add to Favorites button; clicking toggles state
  // -------------------------------------------------------------------------
  test('TC2: Add to Favorites button toggles on show detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/show/28276`);

    // Show title visible
    await expect(page.getByTestId('show-title')).toHaveText('The Witcher');

    // Handle pre-existing state: if already favorited, remove first for clean test
    const removeFavBtn = page.getByTestId('btn-remove-favorite');
    const addFavBtn = page.getByTestId('btn-add-favorite');

    if (await removeFavBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await removeFavBtn.click();
      await expect(addFavBtn).toBeVisible();
    }

    // Click Add to Favorites
    await addFavBtn.click();

    // Confirmation: button changes to Remove from Favorites (active state)
    await expect(removeFavBtn).toBeVisible();
    await expect(addFavBtn).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // TC3: Favorites page shows the added show with correct title and count badge
  // -------------------------------------------------------------------------
  test('TC3: Favorites page shows added show and count badge', async ({ page }) => {
    // Ensure The Witcher is in favorites
    await page.goto(`${BASE_URL}/show/28276`);
    const addFavBtn = page.getByTestId('btn-add-favorite');
    if (await addFavBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addFavBtn.click();
      await expect(page.getByTestId('btn-remove-favorite')).toBeVisible();
    }

    // Navigate to favorites page
    await page.goto(`${BASE_URL}/favorites`);
    await expect(page.getByTestId('page-favorites')).toBeVisible();

    // Favorites page heading
    await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible();

    // Favorites count badge is visible and non-empty
    const countBadge = page.getByTestId('favorites-count');
    await expect(countBadge).toBeVisible();
    const countText = await countBadge.textContent();
    expect(parseInt(countText || '0', 10)).toBeGreaterThan(0);

    // The Witcher card appears in favorites grid
    await expect(page.getByTestId('favorites-grid')).toBeVisible();
    await expect(page.getByTestId('show-card-28276')).toBeVisible();
    await expect(page.getByTestId('show-card-title-28276')).toHaveText('The Witcher');
  });
});
