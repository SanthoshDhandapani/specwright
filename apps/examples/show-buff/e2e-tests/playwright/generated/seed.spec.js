import { test, expect } from '@playwright/test';

/**
 * Explored Test Cases: @ListWorkflow — Create List, Add Shows, Verify List
 * Module: @ListWorkflow
 * Category: @Workflows
 * Sub-Modules: @0-CreateList, @1-AddShows, @2-VerifyList
 * Page URL: https://specwright-show-buff.vercel.app/lists
 *
 * 3-Phase Workflow:
 *   Phase 0 (@0-CreateList / @precondition):
 *     - Creates "My Top Shows" list on /lists
 *     - Snapshots localStorage after creation and navigates to list detail
 *
 *   Phase 1 (@1-AddShows / @workflow-consumer @cross-feature-data):
 *     - Restores Phase 0 localStorage state (customLists with empty "My Top Shows")
 *     - Navigates to /show/169 (Breaking Bad) and adds to "My Top Shows"
 *     - Navigates to /show/82 (Game of Thrones) and adds to "My Top Shows"
 *     - Snapshots localStorage after both additions for Phase 2
 *
 *   Phase 2 (@2-VerifyList / @workflow-consumer):
 *     - Restores Phase 1 localStorage state (customLists with 2 shows)
 *     - Navigates to /lists and verifies "My Top Shows" card shows count "2 shows"
 *     - Clicks "My Top Shows" card and verifies both show names appear in detail grid
 *
 * Cross-phase state transport:
 *   - App stores ALL list data in localStorage under key: specwright-show-data
 *   - Auth data stored under key: specwright-show-user
 *   - Consumer phases MUST restore via page.addInitScript() BEFORE first navigation
 *   - addInitScript fires before page scripts — guarantees app reads restored state on init
 *
 * Selectors verified against live memory (source-confirmed, re-verified 2026-04-19):
 *
 * Key selectors — /lists page:
 *   [data-testid="page-lists"]                       — main page container
 *   [data-testid="create-list-form"]                 — create list <form>
 *   [data-testid="create-list-input"]                — list name <input>
 *   [data-testid="create-list-submit"]               — submit <button>
 *   [data-testid="create-list-error"]                — validation error <p> (empty submit)
 *   [data-testid="lists-empty-state"]                — shown when no lists exist
 *   [data-testid="lists-grid"]                       — grid of list cards
 *   [data-testid^="list-card-"]                      — list card <a> href="/lists/{uuid}"
 *   [data-testid^="list-card-name-"]                 — list card name <h3>
 *   [data-testid^="list-card-count-"]                — list card show count <span>
 *
 * Key selectors — /lists/{uuid} detail page:
 *   [data-testid="page-list-detail"]                 — detail page container
 *   [data-testid="rename-list-display"]              — list name <h1> (click to enter rename mode)
 *   span.rounded-full.bg-brand-600                   — show count badge (no data-testid)
 *   [data-testid="btn-delete-list"]                  — delete list <button>
 *   [data-testid="delete-list-dialog"]               — delete confirmation modal
 *   [data-testid="delete-list-cancel"]               — cancel delete <button>
 *   [data-testid="delete-list-confirm"]              — confirm delete <button>
 *   [data-testid="remove-show-{showId}"]             — remove show button (opacity-0, force-click)
 *   page.getByRole('heading', { name: showName })    — show name <h3> in detail grid (no data-testid)
 *
 * Key selectors — /show/{id} detail page:
 *   [data-testid="page-show-detail"]                 — show detail container
 *   [data-testid="show-title"]                       — show <h1>
 *   [data-testid="show-rating"]                      — rating <span>
 *   [data-testid="back-button"]                      — back navigation button
 *   [data-testid="add-to-list-trigger"]              — "+ Add to List" toggle <button>
 *   [data-testid="add-to-list-menu"]                 — dropdown container (visible when open)
 *   [data-testid^="add-to-list-option-"]             — list option <button> (UUID-based)
 *
 * Key selectors — /home page:
 *   [data-testid="page-home"]                        — home page container
 *   [data-testid="show-grid"]                        — show card grid
 *   [data-testid^="show-card-"]                      — show card <a> href="/show/{id}"
 *
 * localStorage keys:
 *   specwright-show-user  — auth session { name, email, picture }
 *   specwright-show-data  — app state { favorites: [], watchlist: [], customLists: [] }
 *
 * Known gotchas:
 *   - remove-show-{id} button is opacity-0 by default — MUST use click({ force: true })
 *   - add-to-list-option testIds use list UUIDs — use prefix selector [data-testid^="add-to-list-option-"]
 *   - list-card testIds use list UUIDs — use prefix selector [data-testid^="list-card-"]
 *   - Show names in list detail have NO data-testid — use getByRole('heading', { name: showName })
 *   - Allow 15s for TVMaze API fetch on list detail page
 *   - Add to List menu stays open after clicking an option — navigate away or click elsewhere to close
 *
 * Stable TVMaze show IDs:
 *   Breaking Bad = 169, Game of Thrones = 82, The Office = 526, Stranger Things = 2993
 */

const BASE_URL = process.env.BASE_URL || 'https://specwright-show-buff.vercel.app';

// Auth values — read from env vars loaded by playwright.config.ts dotenv
const OAUTH_STORAGE_KEY = process.env.OAUTH_STORAGE_KEY; // Required — no fallback
const TEST_USER_NAME = process.env.TEST_USER_NAME || '';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PICTURE = process.env.TEST_USER_PICTURE || '';

// App data storage key (Zustand persistence layer)
const APP_DATA_STORAGE_KEY = 'specwright-show-data';

// Stable TVMaze show IDs used as test fixtures
const SHOW_1_ID = 169;       // Breaking Bad
const SHOW_1_NAME = 'Breaking Bad';
const SHOW_2_ID = 82;        // Game of Thrones
const SHOW_2_NAME = 'Game of Thrones';

const LIST_NAME = 'My Top Shows';

test.setTimeout(90000);

/**
 * Injects auth into localStorage via addInitScript (runs BEFORE page scripts)
 * then navigates to the target path.
 *
 * IMPORTANT: always call this BEFORE page.goto() — addInitScript is registered
 * at the page level and fires on every navigation for that page instance.
 */
async function authenticate(page, targetPath = '/home') {
  if (!OAUTH_STORAGE_KEY) {
    throw new Error('OAUTH_STORAGE_KEY is not set in environment. Cannot authenticate.');
  }
  await page.addInitScript(
    ({ key, user }) => {
      localStorage.setItem(key, JSON.stringify(user));
    },
    {
      key: OAUTH_STORAGE_KEY,
      user: { name: TEST_USER_NAME, email: TEST_USER_EMAIL, picture: TEST_USER_PICTURE },
    }
  );
  await page.goto(`${BASE_URL}${targetPath}`);
}

/**
 * Injects both auth AND restored app state into localStorage before the page loads.
 * Used by consumer phases that must start with data from a previous phase.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} appState — e.g. { favorites: [], watchlist: [], customLists: [{...}] }
 * @param {string} targetPath — initial navigation target
 */
async function authenticateWithAppState(page, appState, targetPath = '/lists') {
  if (!OAUTH_STORAGE_KEY) {
    throw new Error('OAUTH_STORAGE_KEY is not set in environment. Cannot authenticate.');
  }
  await page.addInitScript(
    ({ authKey, authUser, dataKey, dataValue }) => {
      localStorage.setItem(authKey, JSON.stringify(authUser));
      localStorage.setItem(dataKey, JSON.stringify(dataValue));
    },
    {
      key: OAUTH_STORAGE_KEY,
      authKey: OAUTH_STORAGE_KEY,
      authUser: { name: TEST_USER_NAME, email: TEST_USER_EMAIL, picture: TEST_USER_PICTURE },
      dataKey: APP_DATA_STORAGE_KEY,
      dataValue: appState,
    }
  );
  await page.goto(`${BASE_URL}${targetPath}`);
}
