/**
 * Seed file: @FavoritesWorkflow — Validated Selectors
 * Generated: 2026-04-11T18:13:41.700Z
 * Source: Browser exploration of https://specwright-show-buff.vercel.app/home
 * Status: EXPLORED (selectors from live browser)
 */

export const favoritesWorkflowSelectors = {
  pageHome: {
    selector: 'getByTestId('page-home')',
    type: 'testid',
    tag: 'DIV',
    text: "Top TV Shows",
    description: "Home page main container",
    validated: true
  },
  showGrid: {
    selector: 'getByTestId('show-grid')',
    type: 'testid',
    tag: 'DIV',
    text: "Show cards grid",
    description: "Grid container for all show cards on home/favorites page",
    validated: true
  },
  showCardBreakingBad: {
    selector: 'getByTestId('show-card-169')',
    type: 'testid',
    tag: 'A',
    text: "Breaking Bad",
    description: "Breaking Bad show card link on home page",
    validated: true
  },
  showCardTitleBreakingBad: {
    selector: 'getByTestId('show-card-title-169')',
    type: 'testid',
    tag: 'H3',
    text: "Breaking Bad",
    description: "Breaking Bad show card title heading",
    validated: true
  },
  headerNavFavorites: {
    selector: 'getByTestId('header-nav-favorites')',
    type: 'testid',
    tag: 'A',
    text: "Favorites",
    description: "Favorites navigation link in header",
    validated: true
  },
  headerNavHome: {
    selector: 'getByTestId('header-nav-home')',
    type: 'testid',
    tag: 'A',
    text: "Home",
    description: "Home navigation link in header",
    validated: true
  },
  yearPagination: {
    selector: 'getByTestId('year-pagination')',
    type: 'testid',
    tag: 'DIV',
    text: "Year filter tabs",
    description: "Year filter buttons container on home page",
    validated: true
  },
  pageShowDetail: {
    selector: 'getByTestId('page-show-detail')',
    type: 'testid',
    tag: 'DIV',
    text: "Show detail page container",
    description: "Main container for show detail page",
    validated: true
  },
  showTitle: {
    selector: 'getByTestId('show-title')',
    type: 'testid',
    tag: 'H1',
    text: "Breaking Bad",
    description: "Show title heading on detail page",
    validated: true
  },
  btnAddFavorite: {
    selector: 'getByTestId('btn-add-favorite')',
    type: 'testid',
    tag: 'BUTTON',
    text: "♡ Add to Favorites",
    description: "Add to Favorites button on show detail page",
    validated: true
  },
  btnRemoveFavorite: {
    selector: 'getByTestId('btn-remove-favorite')',
    type: 'testid',
    tag: 'BUTTON',
    text: "♥ Remove from Favorites",
    description: "Remove from Favorites button (shown after adding — active/toggled state)",
    validated: true
  },
  backButton: {
    selector: 'getByTestId('back-button')',
    type: 'testid',
    tag: 'BUTTON',
    text: "← Back",
    description: "Back button on show detail page",
    validated: true
  },
  showRating: {
    selector: 'getByTestId('show-rating')',
    type: 'testid',
    tag: 'SPAN',
    text: "★ 9.2",
    description: "Show rating on detail page",
    validated: true
  },
  pageFavorites: {
    selector: 'getByTestId('page-favorites')',
    type: 'testid',
    tag: 'DIV',
    text: "Favorites page container",
    description: "Main container for favorites page",
    validated: true
  },
  favoritesCount: {
    selector: 'getByTestId('favorites-count')',
    type: 'testid',
    tag: 'SPAN',
    text: "4",
    description: "Favorites count badge showing number of favorited shows",
    validated: true
  },
  favoritesGrid: {
    selector: 'getByTestId('favorites-grid')',
    type: 'testid',
    tag: 'DIV',
    text: "Favorites shows grid",
    description: "Grid container for favorited shows on favorites page",
    validated: true
  },
  showCardInFavorites: {
    selector: 'getByTestId('show-card-169')',
    type: 'testid',
    tag: 'A',
    text: "Breaking Bad",
    description: "Show card for Breaking Bad in favorites grid",
    validated: true
  },
  showCardTitleInFavorites: {
    selector: 'getByTestId('show-card-title-169')',
    type: 'testid',
    tag: 'H3',
    text: "Breaking Bad",
    description: "Show card title for Breaking Bad in favorites grid",
    validated: true
  },
  userMenuTrigger: {
    selector: 'getByTestId('user-menu-trigger')',
    type: 'testid',
    tag: 'BUTTON',
    text: "Santhosh",
    description: "User profile menu trigger button in header",
    validated: true
  },
  showCardGeneric: {
    selector: 'getByTestId('show-card-{id}')',
    type: 'testid',
    tag: 'A',
    text: "Dynamic show card",
    description: "Generic pattern for any show card — replace {id} with actual show ID",
    validated: true
  },
  showCardTitleGeneric: {
    selector: 'getByTestId('show-card-title-{id}')',
    type: 'testid',
    tag: 'H3',
    text: "Dynamic show title",
    description: "Generic pattern for any show card title — replace {id} with actual show ID",
    validated: true
  }
};

// ─── @ListWorkflow Selectors (added 2026-04-12) ───────────────────────────────

export const listWorkflowSelectors = {
  // /lists page
  pageLists: {
    selector: "getByTestId('page-lists')",
    type: 'testid', tag: 'DIV',
    description: 'Main container for /lists page',
    validated: true
  },
  createListInput: {
    selector: "getByTestId('create-list-input')",
    type: 'testid', tag: 'INPUT',
    description: 'Inline input for new list name on /lists page',
    validated: true
  },
  createListSubmit: {
    selector: "getByTestId('create-list-submit')",
    type: 'testid', tag: 'BUTTON', text: 'Create',
    description: 'Submit button to create a new list',
    validated: true
  },
  listsGrid: {
    selector: "getByTestId('lists-grid')",
    type: 'testid', tag: 'DIV',
    description: 'Grid container for all list cards on /lists page',
    validated: true
  },
  listCardDynamic: {
    selector: "getByTestId('lists-grid').locator('a[data-testid^=\"list-card-\"]')",
    type: 'testid-prefix', tag: 'A',
    description: 'Dynamic list card link — pattern: list-card-{uuid}',
    validated: true
  },
  listCardNameDynamic: {
    selector: "locator('[data-testid^=\"list-card-name-\"]')",
    type: 'testid-prefix', tag: 'H3',
    description: 'List card name heading inside a list card — pattern: list-card-name-{uuid}',
    validated: true
  },
  listCardCountDynamic: {
    selector: "locator('[data-testid^=\"list-card-count-\"]')",
    type: 'testid-prefix', tag: 'SPAN',
    description: 'List card show count badge — pattern: list-card-count-{uuid}, text: "N shows"',
    validated: true
  },
  // show detail page — add-to-list
  addToListTrigger: {
    selector: "getByTestId('add-to-list-trigger')",
    type: 'testid', tag: 'BUTTON', text: '+ Add to List',
    description: 'Button to open the Add to List dropdown on show detail page',
    validated: true
  },
  addToListMenu: {
    selector: "getByTestId('add-to-list-menu')",
    type: 'testid', tag: 'DIV',
    description: 'Dropdown menu showing user lists after clicking add-to-list-trigger',
    validated: true
  },
  addToListOptionDynamic: {
    selector: "getByTestId('add-to-list-menu').locator('[data-testid^=\"add-to-list-option-\"]')",
    type: 'testid-prefix', tag: 'BUTTON',
    description: 'Individual list option button in dropdown — pattern: add-to-list-option-{uuid}. Gets "✓" appended to text after show is added (no toast).',
    validated: true
  },
  // list detail page (/lists/:id)
  pageListDetail: {
    selector: "getByTestId('page-list-detail')",
    type: 'testid', tag: 'DIV',
    description: 'Main container for list detail page /lists/:id',
    validated: true
  },
  renameListDisplay: {
    selector: "getByTestId('rename-list-display')",
    type: 'testid', tag: 'H1',
    description: 'List name H1 heading on list detail page (clickable to rename)',
    validated: true
  },
  btnDeleteList: {
    selector: "getByTestId('btn-delete-list')",
    type: 'testid', tag: 'BUTTON', text: 'Delete List',
    description: 'Delete list button on list detail page',
    validated: true
  },
  removeShowDynamic: {
    selector: "locator('[data-testid^=\"remove-show-\"]')",
    type: 'testid-prefix', tag: 'BUTTON',
    description: 'Remove show button on list detail page — pattern: remove-show-{showId}. One per show in the list.',
    validated: true
  },
};

export const listWorkflowBehaviors = {
  description: 'ShowBuff list management: create lists, add shows from detail page, verify list contents and count badge',
  authentication: 'OAuth via localStorage injection — key: specwright-show-user',
  listsPage: {
    createList: 'Inline form: type name in create-list-input, click create-list-submit. No modal — inline on /lists page.',
    listCards: 'Dynamic UUIDs — find by text name using getByText() or getByRole("link", { name: listName })',
    countBadge: 'list-card-count-{uuid} SPAN shows "N shows" (note: "1 show" not "1 shows")',
  },
  showDetailPage: {
    addToList: 'Click add-to-list-trigger → add-to-list-menu opens → find option by list name text → click option. Confirmation: option text gets "✓" appended (no toast).',
    findOptionByName: 'Use getByTestId("add-to-list-menu").getByRole("button", { name: listName }) to find option by list name.',
  },
  listDetailPage: {
    showsGrid: 'No testId on the shows grid container — use remove-show-{showId} visibility to verify show presence.',
    countBadge: 'No testId on count badge in detail page — use getByText("N show") or page-list-detail scoped assertion.',
    renameList: 'Click rename-list-display H1 to enter rename mode.',
  },
  knownLimitations: [
    'Show count badge on list DETAIL page has no testId — use page.getByText() or parent scoped text assertion',
    'Show title/name in list detail has no testId — verify by remove-show-{showId} button presence',
    'List card UUIDs are dynamic — always find lists by name text, never hardcode UUIDs',
    'Count text format: "0 shows", "1 show", "2 shows" (singular for 1)',
  ],
};

export const favoritesWorkflowBehaviors = {
    "description": "ShowBuff app with home page showing TV shows grid, detail page with add/remove favorites, and favorites page with count badge",
    "authentication": "OAuth via localStorage injection — key: specwright-show-user",
    "navigation": "Header with Home, Favorites, Watchlist, My Lists links plus user avatar menu",
    "homePage": {
      "grid": "show-grid contains show cards (show-card-{id}) filterable by year tabs",
      "showCard": "Clickable link navigating to /show/{id} detail page",
      "yearFilter": "Buttons 2026/2025/2024/2023 to filter shows by premiere year"
    },
    "detailPage": {
      "addFavorite": "btn-add-favorite toggles to btn-remove-favorite (active state) after click — no toast, button state change IS the confirmation",
      "showTitle": "show-title h1 contains the show name to capture for workflow",
      "backButton": "back-button returns to home/previous page"
    },
    "favoritesPage": {
      "countBadge": "favorites-count span shows integer count of total favorited shows",
      "grid": "favorites-grid contains show-card-{id} items for each favorited show",
      "showCardTitle": "show-card-title-{id} h3 contains the show name for assertion"
    }
  };
