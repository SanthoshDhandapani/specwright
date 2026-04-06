/**
 * Specwright Instructions — ShowBuff Example App
 *
 * Copy entries into instructions.js to generate E2E tests.
 * Run: /e2e-automate (CLI) or click Generate in Specwright desktop app.
 */
export default [
  // Module: Show Listing — home page grid, year filter, pagination
  {
    moduleName: '@ShowListing',
    category: '@Modules',
    subModuleName: [],
    fileName: 'show_listing',
    instructions: [
      'Navigate to the home page',
      'Verify show cards are displayed in a grid',
      'Verify each show card shows a poster, title, and rating',
      'Click year tab 2024 and verify shows update',
      'Click year tab 2023 and verify shows update',
      'Click next page and verify new shows load',
      'Click previous page and verify original shows return',
    ],
    pageURL: 'http://localhost:5173/',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // Module: Show Detail — detail page with cast, images, synopsis
  {
    moduleName: '@ShowDetail',
    category: '@Modules',
    subModuleName: [],
    fileName: 'show_detail',
    instructions: [
      'Navigate to the home page and click on the first show card',
      'Verify the detail page shows title, synopsis, rating, premiere date, runtime',
      'Verify the cast list is displayed with actor names and characters',
      'Verify the image gallery shows multiple images',
      'Click back button and verify return to listing',
    ],
    pageURL: 'http://localhost:5173/',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // Module: Authentication — Google sign-in/sign-out
  {
    moduleName: '@Authentication',
    category: '@Modules',
    subModuleName: [],
    fileName: 'authentication',
    instructions: [
      'Navigate to the sign-in page',
      'Verify Google sign-in button is displayed',
      'Sign in with mock Google auth (inject user into localStorage)',
      'Verify user avatar and name appear in header',
      'Sign out via user menu dropdown',
      'Verify sign-in button reappears after sign-out',
    ],
    pageURL: 'http://localhost:5173/signin',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // Workflow: User Journey — sign in → browse → favorite → watchlist (cross-module)
  {
    moduleName: '@UserJourney',
    category: '@Workflows',
    subModuleName: ['@0-Precondition', '@1-AddToFavorites', '@2-AddToWatchlist', '@3-VerifyCollections'],
    fileName: 'user_journey',
    instructions: [
      'Precondition: Sign in, browse shows on home page, click on the first show card, save the show ID and title as shared data',
      'Consumer 1 - Add to Favorites: Load precondition data, navigate to the saved show detail, add to favorites, navigate to /favorites and verify the show appears',
      'Consumer 2 - Add to Watchlist: Load precondition data, navigate to saved show detail, add to watchlist, navigate to /watchlist and verify the show appears',
      'Consumer 3 - Verify Collections: Navigate to /favorites and verify show present, navigate to /watchlist and verify show present, verify counts match',
    ],
    pageURL: 'http://localhost:5173/',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // Workflow: Show Discovery — cross-year browsing
  {
    moduleName: '@ShowDiscovery',
    category: '@Workflows',
    subModuleName: ['@0-Precondition', '@1-CompareDetails', '@2-SearchAndFilter'],
    fileName: 'show_discovery',
    instructions: [
      'Precondition: Browse 2024 shows, capture first show title and ID. Browse 2025 shows, capture first show title and ID. Save both as shared data.',
      'Consumer 1 - Compare Details: Load precondition data, open 2024 show detail and verify title/year/cast. Open 2025 show detail and verify title/year/cast.',
      'Consumer 2 - Search and Filter: Load precondition data, verify 2024 show visible on 2024 tab, switch to 2025 tab, verify 2024 show is no longer shown.',
    ],
    pageURL: 'http://localhost:5173/',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // Module: Custom Lists — CRUD for custom watchlists
  {
    moduleName: '@CustomLists',
    category: '@Modules',
    subModuleName: [],
    fileName: 'custom_lists',
    instructions: [
      'Sign in via mock Google auth',
      'Navigate to /lists page',
      'Verify empty state is displayed when no lists exist',
      'Create a new list via the create form',
      'Verify the new list card appears in the grid with correct name and 0 shows count',
      'Attempt to create a duplicate list and verify error message',
      'Click a list card and verify navigation to list detail page',
      'Rename the list by clicking the heading and typing a new name',
      'Navigate to a show detail page and add the show to the custom list via the dropdown',
      'Navigate back to the list detail page and verify the show appears',
      'Remove the show from the list and verify it disappears',
      'Delete the list via the delete button and confirm in the dialog',
      'Verify redirect to /lists and the list is gone',
    ],
    pageURL: 'http://localhost:5173/lists',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // Workflow: List Workflow — end-to-end custom list management across pages
  {
    moduleName: '@ListWorkflow',
    category: '@Workflows',
    subModuleName: ['@0-Precondition', '@1-ManageLists', '@2-AddShowsToLists', '@3-CleanupLists'],
    fileName: 'list_workflow',
    instructions: [
      'Precondition: Sign in via mock Google auth. Navigate to /lists. Create two custom lists ("Drama Picks" and "Comedy Night"). Save list IDs as shared data.',
      'Consumer 1 - Manage Lists: Load precondition data. Verify both lists appear on /lists page. Rename "Drama Picks" to "Top Dramas". Verify rename persists after page reload.',
      'Consumer 2 - Add Shows to Lists: Load precondition data. Navigate to a show detail page. Add show to both custom lists via the dropdown. Navigate to each list detail page and verify the show appears.',
      'Consumer 3 - Cleanup Lists: Load precondition data. Navigate to first list detail. Remove all shows. Delete the list. Navigate to /lists and verify only one list remains. Delete the remaining list and verify empty state.',
    ],
    pageURL: 'http://localhost:5173/',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // Workflow: Auth Protected Flow — auth gating across modules
  {
    moduleName: '@AuthProtectedFlow',
    category: '@Workflows',
    subModuleName: ['@0-Precondition', '@1-FavoriteCRUD', '@2-WatchlistCRUD', '@3-SignOutCleanup'],
    fileName: 'auth_protected_flow',
    instructions: [
      'Precondition: Attempt to visit /favorites without auth, verify redirect to /signin. Sign in via mock Google auth. Save auth state.',
      'Consumer 1 - Favorite CRUD: Load auth state. Add 3 shows to favorites from different detail pages. Navigate to /favorites, verify all 3 appear. Remove 1, verify 2 remain.',
      'Consumer 2 - Watchlist CRUD: Load auth state. Add 2 shows to watchlist. Navigate to /watchlist, verify both appear. Remove all, verify empty state.',
      'Consumer 3 - Sign Out Cleanup: Load auth state. Sign out. Verify /favorites redirects to /signin. Verify /watchlist redirects to /signin.',
    ],
    pageURL: 'http://localhost:5173/',
    explore: true,
    runExploredCases: false,
    runGeneratedCases: false,
  },
];
