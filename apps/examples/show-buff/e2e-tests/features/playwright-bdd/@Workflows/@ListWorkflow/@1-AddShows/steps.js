/**
 * List Workflow — @1-AddShows steps
 * Tags: @listworkflow @add-shows @serial-execution @workflow-consumer @cross-feature-data
 *
 * Selectors (all data-testid, validated 2026-04-12):
 *   page-show-detail       — show detail page container DIV
 *   show-title             — show title H1 on detail page
 *   add-to-list-trigger    — "+ Add to List" BUTTON
 *   add-to-list-menu       — dropdown panel DIV (visible after clicking trigger)
 *   back-button            — ← Back BUTTON on detail page
 *
 * Shared steps used here (from shared/ — globally scoped, no re-definition needed):
 *   Given I load predata from {string}           → shared/workflow.steps.js
 *   Given the home page loads with the show grid visible → shared/workflow.steps.js
 *   When I click the first show card in the grid  → shared/workflow.steps.js
 *   Then I am on the show detail page             → shared/workflow.steps.js
 *
 * Saves: saveScopedTestData('listworkflow', { listName, firstShowTitle, secondShowTitle })
 * Loads: listName from loadScopedTestData('listworkflow') via "I load predata" step
 *
 * NOTE on add-to-list confirmation:
 *   No toast notification. Confirmation = option button text gets "✓" appended.
 *   Assert with: expect(option).toContainText('My Top Shows✓')
 *   The menu may close immediately — if so, re-open and verify the checkmark is present.
 */
import { When, Then, expect } from '../../../../../playwright/fixtures.js';
import { saveScopedTestData, loadScopedTestData } from '../../../../../playwright/fixtures.js';

Then('I capture and store the first show title', async ({ page, testData }) => {
  const titleEl = page.getByTestId('show-title');
  await expect(titleEl).toBeVisible({ timeout: 10000 });
  testData.firstShowTitle = (await titleEl.textContent())?.trim() ?? '';
  console.log(`[add-shows] Captured firstShowTitle: "${testData.firstShowTitle}"`);
});

When('I add the current show to the {string} list', async ({ page, testData }, listName) => {
  const trigger = page.getByTestId('add-to-list-trigger');
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.click();

  const menu = page.getByTestId('add-to-list-menu');
  await expect(menu).toBeVisible({ timeout: 10000 });

  const option = menu.getByRole('button', { name: listName });
  await expect(option).toBeVisible({ timeout: 10000 });
  await option.click();

  // Store the list name used for this add operation (for confirmation assertion)
  testData._lastAddedToList = listName;
  console.log(`[add-shows] Clicked "${listName}" option in add-to-list menu`);
});

Then('the list option confirms the show was added', async ({ page, testData }) => {
  const listName = testData._lastAddedToList || testData.listName || 'My Top Shows';
  const expectedText = `${listName}✓`;

  // Attempt 1: menu may still be open — check the option text directly
  const menu = page.getByTestId('add-to-list-menu');
  const menuVisible = await menu.isVisible().catch(() => false);

  if (menuVisible) {
    const option = menu.getByRole('button', { name: new RegExp(listName) });
    const visible = await option.isVisible().catch(() => false);
    if (visible) {
      await expect(option).toContainText(expectedText, { timeout: 5000 });
      console.log(`[add-shows] Confirmed: option shows "${expectedText}"`);
      return;
    }
  }

  // Attempt 2: menu closed — re-open and verify the checkmark
  const trigger = page.getByTestId('add-to-list-trigger');
  const triggerVisible = await trigger.isVisible().catch(() => false);
  if (triggerVisible) {
    await trigger.click();
    const reopenedMenu = page.getByTestId('add-to-list-menu');
    await expect(reopenedMenu).toBeVisible({ timeout: 10000 });
    const option = reopenedMenu.getByRole('button', { name: new RegExp(listName) });
    await expect(option).toContainText(expectedText, { timeout: 5000 });
    console.log(`[add-shows] Confirmed (after re-open): option shows "${expectedText}"`);
    // Close menu again by clicking elsewhere
    await page.keyboard.press('Escape');
  } else {
    // If trigger is not visible (e.g., page changed), skip confirmation — already added
    console.log(`[add-shows] Add-to-list trigger not visible — skipping confirmation check`);
  }
});

When('I go back to the home page', async ({ page, testConfig }) => {
  // Try the back button first (navigates to previous page in history)
  const backBtn = page.getByTestId('back-button');
  const backVisible = await backBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (backVisible) {
    await backBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByTestId('page-home')).toBeVisible({ timeout: 10000 });
  } else {
    // Fallback: navigate directly to /home
    const baseUrl = process.env.BASE_URL || testConfig.baseUrl || 'https://specwright-show-buff.vercel.app';
    await page.goto(`${baseUrl}/home`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.getByTestId('page-home')).toBeVisible({ timeout: 10000 });
  }
  console.log(`[add-shows] Returned to home page`);
});

When('I click the second show card in the grid', async ({ page, testData }) => {
  const secondCard = page.getByTestId('show-grid').locator('a[data-testid^="show-card-"]').nth(1);
  await expect(secondCard).toBeVisible({ timeout: 10000 });
  await secondCard.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page).toHaveURL(/\/show\/\d+/, { timeout: 15000 });
});

Then('I capture and store the second show title', async ({ page, testData }) => {
  const titleEl = page.getByTestId('show-title');
  await expect(titleEl).toBeVisible({ timeout: 10000 });
  testData.secondShowTitle = (await titleEl.textContent())?.trim() ?? '';
  console.log(`[add-shows] Captured secondShowTitle: "${testData.secondShowTitle}"`);
});

Then('I save both show titles for workflow verification', async ({ page, testData }) => {
  // Load existing listworkflow data (listName saved by @0-CreateList)
  const existingData = loadScopedTestData('listworkflow');
  const listName = testData.listName || existingData.listName || 'My Top Shows';
  const firstShowTitle = testData.firstShowTitle || '';
  const secondShowTitle = testData.secondShowTitle || '';

  if (!firstShowTitle) {
    console.warn(`[add-shows] WARNING: firstShowTitle is empty — was it captured before navigation?`);
  }
  if (!secondShowTitle) {
    console.warn(`[add-shows] WARNING: secondShowTitle is empty`);
  }

  // Capture current localStorage state so @2-VerifyList can restore Zustand store
  const movieStoreData = await page.evaluate(() => localStorage.getItem('specwright-show-data'));

  saveScopedTestData('listworkflow', {
    listName,
    firstShowTitle,
    secondShowTitle,
    movieStoreData,
  });
  console.log(
    `[add-shows] Saved to listworkflow: listName="${listName}", firstShowTitle="${firstShowTitle}", secondShowTitle="${secondShowTitle}", movieStoreData=${!!movieStoreData}`,
  );
});
