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
