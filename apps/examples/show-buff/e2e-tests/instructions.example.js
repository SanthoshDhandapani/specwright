/**
 * instructions.example.js — Show-Buff Demo App
 *
 * Show-Buff is a TV show discovery app: browse shows by year, manage
 * favorites, watchlists, and custom lists.
 *
 * Copy any entry below into instructions.js to generate BDD tests.
 * Run with: /e2e-automate (Claude Code skill)
 *
 * After generation:
 *   pnpm bddgen          # regenerate .features-gen/
 *   pnpm test:bdd         # run all BDD tests
 *
 * Auth:    OAuth — localStorage injection via OAUTH_STORAGE_KEY
 */

export default [

  // ─────────────────────────────────────────────────────────────
  // MODULE 1: HomePage — Top TV Shows Browse Experience
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@HomePage',
    category: '@Modules',
    subModuleName: [],
    fileName: 'homepage',
    instructions: [
      'Verify home page loads with header, year tabs, show grid, and footer',
      'Verify navigation links: Home (/), Favorites (/favorites), Watchlist (/watchlist), Lists (/lists)',
      'Verify user menu — click trigger to open dropdown, click again to close',
      'Verify year filter tabs: 4 tabs (current year and 3 prior), active tab has brand-600 background',
      'Click a year tab and verify show grid reloads for that year',
      'Verify pagination: page-prev is disabled on page 1, page-next is enabled if multiple pages exist',
      'Navigate to next page, verify page indicator updates to "Page 2 of N", prev becomes enabled',
      'Navigate back to page 1, verify prev is disabled again',
      'Click first show card and verify navigation to /show/:id detail page',
      'Verify footer shows TVMaze attribution link opening in new tab',
    ],
    pageURL: '/home',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 2: ShowDetailPage — Individual Show Information
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@ShowDetail',
    category: '@Modules',
    subModuleName: [],
    fileName: 'show_detail',
    instructions: [
      'Navigate to a show detail page from the home page by clicking a show card',
      'Verify show detail elements are visible: title, rating, premiere date, runtime, status badge, genres, synopsis',
      'Verify back button navigates back to the previous page',
      'Verify Add to Favorites button is visible; click it to add the show to favorites',
      'After adding, verify button changes to "Remove from Favorites" with red background',
      'Click Remove from Favorites and verify button reverts to "Add to Favorites"',
      'Verify Add to Watchlist button is visible; click it to add the show to watchlist',
      'After adding, verify button shows "In Watchlist" with gray background',
      'Click "In Watchlist" button to remove from watchlist, verify it reverts to "Add to Watchlist"',
      'Click the "Add to List" trigger to open the custom list dropdown menu',
      'Verify dropdown shows available custom lists (or empty if no lists created)',
      'Select a custom list from dropdown and verify the show is added (checkmark appears next to list name)',
    ],
    pageURL: '/home',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 3: FavoritesPage — User's Favorited Shows
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@Favorites',
    category: '@Modules',
    subModuleName: [],
    fileName: 'favorites',
    instructions: [
      'Navigate to /favorites page',
      'Verify page loads with heading "My Favorites"',
      'When no favorites exist, verify empty state message: "No favorites yet."',
      'Verify empty state helper text: "Browse shows and click ♡ to add them here."',
      'After adding a show as favorite (from show detail page), verify favorites-count badge updates',
      'Verify the favorited show card appears in the favorites grid',
      'Click a show card in the favorites grid and verify navigation to show detail page',
      'Remove a show from favorites via show detail page, verify it disappears from favorites grid',
      'After removing all favorites, verify empty state is shown again',
    ],
    pageURL: '/favorites',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 4: WatchlistPage — User's Watchlist
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@Watchlist',
    category: '@Modules',
    subModuleName: [],
    fileName: 'watchlist',
    instructions: [
      'Navigate to /watchlist page',
      'Verify page loads with heading "My Watchlist"',
      'When watchlist is empty, verify empty state: "Your watchlist is empty."',
      'Verify empty state helper text: "Browse shows and click + to add them here."',
      'After adding a show to watchlist from show detail page, verify watchlist-count badge updates',
      'Verify the show card appears in the watchlist grid',
      'Click a show card in the watchlist grid and verify navigation to show detail page',
      'Remove a show from watchlist via show detail page, verify it disappears from watchlist grid',
    ],
    pageURL: '/watchlist',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 5: ListsPage — Custom Lists Management
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@Lists',
    category: '@Modules',
    subModuleName: [],
    fileName: 'lists',
    instructions: [
      'Navigate to /lists page',
      'Verify page loads with heading "My Lists"',
      'When no lists exist, verify empty state: "No custom lists yet."',
      'Verify the create list form is visible with input field and Create button',
      'Type a list name and click Create — verify new list card appears in the grid',
      'Attempt to create a list with an empty name — verify error message is shown',
      'Attempt to create a duplicate list name — verify error message about duplicate names',
      'Verify list card shows the list name and show count (0 initially)',
      'Click a list card and verify navigation to /lists/:id detail page',
    ],
    pageURL: '/lists',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 6: ListDetailPage — Shows Within a Custom List
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@ListDetail',
    category: '@Modules',
    subModuleName: [],
    fileName: 'list_detail',
    instructions: [
      'Navigate to /lists/:id page for an existing custom list',
      'Verify page shows the list name (editable), show count badge, and Delete List button',
      'When list is empty, verify empty state: "This list is empty."',
      'After adding shows to the list, verify show cards appear in the grid',
      'Hover over a show card to reveal the Remove button — click it and verify show is removed',
      'Click on the list name to edit it (RenameListInput), change name and confirm',
      'Verify the page title updates with the new list name',
      'Click Delete List button — verify confirmation dialog appears with list name',
      'Confirm deletion — verify navigation back to /lists page and the list no longer exists',
      'Cancel deletion in the dialog — verify the list remains and user stays on the detail page',
    ],
    pageURL: '/lists',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW 1: Add Show to Favorites & Verify Cross-Page
  // Precondition: User is authenticated
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@FavoritesWorkflow',
    category: '@Workflows',
    subModuleName: ['@0-Precondition', '@1-VerifyFavorites'],
    fileName: 'favorites_workflow',
    instructions: [
      '@0-Precondition: Navigate to home page, click on a show card to open detail page, note the show name, click Add to Favorites, verify confirmation that show is added',
      '@1-VerifyFavorites: Navigate to /favorites page, verify the show from the precondition appears in the favorites grid with correct title, verify favorites count badge matches',
    ],
    pageURL: '/home',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW 2: Create List & Add Shows — End-to-End
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@ListWorkflow',
    category: '@Workflows',
    subModuleName: ['@0-CreateList', '@1-AddShows', '@2-VerifyList'],
    fileName: 'list_workflow',
    instructions: [
      '@0-CreateList: Navigate to /lists, create a new list named "My Top Shows", verify the list card appears and clicking it goes to the list detail page',
      '@1-AddShows: Navigate to home page, click a show, use the Add to List dropdown to add it to "My Top Shows", go to a second show and also add it to "My Top Shows"',
      '@2-VerifyList: Navigate to /lists, click "My Top Shows" list card, verify both shows appear in the grid, verify the show count badge on the list card shows 2',
    ],
    pageURL: '/lists',
    inputs: {},
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

];

/**
 * Field Reference:
 *
 * filePath      — Source file (CSV, Excel, PDF, JSON). Leave "" for instruction/Jira-based.
 * moduleName    — Target module directory name (e.g., "@HomePage", "@Favorites").
 * category      — "@Modules" (default) or "@Workflows".
 * subModuleName — For workflows: ordered sub-step directories (e.g., ["@0-Precondition", "@1-Consumer"]).
 * fileName      — Output filename stem (e.g., "homepage" → homepage.feature + steps.js).
 * instructions  — Free-text test descriptions. One instruction = one scenario area.
 * pageURL       — App URL for browser exploration. Required when explore: true.
 * inputs.jira   — { url: "https://org.atlassian.net/browse/PROJ-123" } for Jira-driven generation.
 * explore       — Enable live browser exploration for selector discovery (Phase 4).
 * runExploredCases  — Run seed tests in browser before BDD generation (Phase 5).
 * runGeneratedCases — Run generated BDD tests after creation (Phase 8).
 *
 * Show-Buff Key Selectors (for reference):
 *   Pages:      page-home, page-show-detail, page-favorites, page-watchlist, page-lists, page-list-detail
 *   Year tabs:  year-tab-{year} (e.g. year-tab-2025)
 *   Pagination: page-prev, page-next, page-indicator
 *   Show cards: show-card-{id}, show-card-title-{id}, show-card-rating-{id}
 *   Favorites:  btn-add-favorite, btn-remove-favorite, favorites-count, favorites-grid, favorites-empty-state
 *   Watchlist:  btn-add-watchlist, btn-remove-watchlist, watchlist-count, watchlist-grid, watchlist-empty-state
 *   Lists:      create-list-form, create-list-input, create-list-submit, create-list-error
 *               lists-grid, lists-empty-state, add-to-list-trigger, add-to-list-menu, add-to-list-option-{id}
 *   List Detail: btn-delete-list, remove-show-{showId}, page-list-detail
 *   Header:     header, header-logo, header-nav-home, header-nav-favorites, header-nav-watchlist, header-nav-lists
 *   User Menu:  user-menu-trigger, user-avatar, user-display-name, user-menu-dropdown, user-menu-signout
 */
