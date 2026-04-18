# Planner Memory

## Key Selectors

<!-- One table per page/module — added by the planner agent after each exploration session -->
<!-- Format used by agent:
## Key Selectors: <Module> (<url>)
| Element | Selector | Notes |
| ------- | -------- | ----- |
-->

### Key Selectors: @HomePage (https://specwright-show-buff.vercel.app/home)

| Element | Selector | Notes |
| ------- | -------- | ----- |
| header | `getByTestId('header')` | HEADER element |
| headerLogo | `getByTestId('header-logo')` | A, links to / |
| navHome | `getByTestId('header-nav-home')` | href="/" |
| navFavorites | `getByTestId('header-nav-favorites')` | href="/favorites" |
| navWatchlist | `getByTestId('header-nav-watchlist')` | href="/watchlist" |
| navLists | `getByTestId('header-nav-lists')` | href="/lists", **text="My Lists"** (not "Lists") |
| userMenuTrigger | `getByTestId('user-menu-trigger')` | BUTTON, toggles dropdown |
| userAvatar | `getByTestId('user-avatar')` | IMG |
| userDisplayName | `getByTestId('user-display-name')` | SPAN |
| signOutButton | `getByRole('button', { name: 'Sign Out' })` | Inside user menu dropdown (no testId on dropdown) |
| pageHome | `getByTestId('page-home')` | Main page container DIV |
| yearPagination | `getByTestId('year-pagination')` | Year tabs container DIV |
| yearTab2026 | `getByTestId('year-tab-2026')` | Active class: bg-brand-600 |
| yearTab2025 | `getByTestId('year-tab-2025')` | Inactive class: bg-gray-800 |
| yearTab2024 | `getByTestId('year-tab-2024')` | Has 2 pages — use for pagination tests |
| yearTab2023 | `getByTestId('year-tab-2023')` | |
| pagePrev | `getByTestId('page-prev')` | BUTTON, disabled on page 1 |
| pageIndicator | `getByTestId('page-indicator')` | SPAN, text: "Page X of Y" |
| pageNext | `getByTestId('page-next')` | BUTTON, disabled on last page |
| showGrid | `getByTestId('show-grid')` | DIV |
| showCard (first) | `getByTestId('show-grid').locator('a[data-testid^="show-card-"]').first()` | IDs are dynamic |
| footer | `locator('footer')` | No testId — use tag selector |
| tvmazeLink | `getByRole('link', { name: 'TVMaze' })` | href="https://www.tvmaze.com/", target="_blank" |

### Key Selectors: @FavoritesWorkflow (https://specwright-show-buff.vercel.app/home + /show/:id + /favorites)

| Element | Selector | Notes |
| ------- | -------- | ----- |
| pageHome | `getByTestId('page-home')` | Home page main container DIV |
| showGrid | `getByTestId('show-grid')` | Show cards grid on home & favorites page |
| showCard | `getByTestId('show-card-{id}')` | Generic pattern — replace {id} with show ID (e.g. show-card-169) |
| showCardTitle | `getByTestId('show-card-title-{id}')` | Show card title H3 — replace {id} with show ID |
| showCardBreakingBad | `getByTestId('show-card-169')` | Breaking Bad show card (ID=169) |
| pageShowDetail | `getByTestId('page-show-detail')` | Show detail page container DIV |
| showTitle | `getByTestId('show-title')` | Show title H1 on detail page |
| showRating | `getByTestId('show-rating')` | Show rating SPAN on detail page |
| showPremiered | `getByTestId('show-premiered')` | Premiere date SPAN |
| showRuntime | `getByTestId('show-runtime')` | Runtime SPAN |
| showStatus | `getByTestId('show-status')` | Status SPAN (e.g. "Ended") |
| showGenres | `getByTestId('show-genres')` | Genres container DIV |
| showSynopsis | `getByTestId('show-synopsis')` | Synopsis paragraph P |
| btnAddFavorite | `getByTestId('btn-add-favorite')` | Add to Favorites BUTTON — visible before adding |
| btnRemoveFavorite | `getByTestId('btn-remove-favorite')` | Remove from Favorites BUTTON — visible AFTER adding (no toast, button toggle IS the confirmation) |
| backButton | `getByTestId('back-button')` | ← Back BUTTON on detail page |
| castList | `getByTestId('cast-list')` | Cast section DIV |
| showImageGallery | `getByTestId('show-image-gallery')` | Image gallery DIV |
| pageFavorites | `getByTestId('page-favorites')` | Favorites page main container DIV |
| favoritesCount | `getByTestId('favorites-count')` | Count badge SPAN — integer count of favorited shows |
| favoritesGrid | `getByTestId('favorites-grid')` | Favorites grid DIV |

### Key Selectors: @ListWorkflow (https://specwright-show-buff.vercel.app/lists)

| Element | Selector | Notes |
| ------- | -------- | ----- |
| pageLists | `getByTestId('page-lists')` | DIV — main container for /lists page |
| createListInput | `getByTestId('create-list-input')` | INPUT — inline new list name field |
| createListSubmit | `getByTestId('create-list-submit')` | BUTTON — text "Create" |
| listsGrid | `getByTestId('lists-grid')` | DIV — grid of list cards |
| listCard (dynamic) | `getByTestId('lists-grid').locator('a[data-testid^="list-card-"]')` | A — pattern: list-card-{uuid} |
| listCardName (dynamic) | `locator('[data-testid^="list-card-name-"]')` | H3 — pattern: list-card-name-{uuid} |
| listCardCount (dynamic) | `locator('[data-testid^="list-card-count-"]')` | SPAN — pattern: list-card-count-{uuid}, text: "N shows" |
| addToListTrigger | `getByTestId('add-to-list-trigger')` | BUTTON — "+ Add to List" on show detail page |
| addToListMenu | `getByTestId('add-to-list-menu')` | DIV — dropdown, visible after clicking trigger |
| addToListOption (dynamic) | `getByTestId('add-to-list-menu').getByRole('button', { name: listName })` | BUTTON — find by list name text; gets "✓" appended after adding (no toast) |
| pageListDetail | `getByTestId('page-list-detail')` | DIV — main container for /lists/:id page |
| renameListDisplay | `getByTestId('rename-list-display')` | H1 — list name, clickable to rename |
| btnDeleteList | `getByTestId('btn-delete-list')` | BUTTON — "Delete List" |
| removeShow (dynamic) | `locator('[data-testid^="remove-show-"]')` | BUTTON — pattern: remove-show-{showId}, one per show in list |
| showCountBadge (detail) | `getByTestId('page-list-detail').getByText(/\d+ shows?/)` | SPAN — **no testId** on detail page count badge |

## Navigation Paths

| Module | URL | Key Pages | Discovered |
| ------ | --- | --------- | ---------- |
| @HomePage | /home | /home, /show/:id, /favorites, /watchlist, /lists | 2026-04-11 |
| @FavoritesWorkflow | /home → /show/:id → /favorites | Multi-page workflow: home → detail → favorites | 2026-04-11 |
| @ListWorkflow | /lists → /show/:id → /lists/:id | Multi-page workflow: lists → show detail (add) → list detail (verify) | 2026-04-12 |

## Reusable Patterns

| Pattern | Description | Example | Discovered |
| ------- | ----------- | ------- | ---------- |
| OAuth Auth | Inject user JSON into localStorage before navigating | `localStorage.setItem('specwright-show-user', JSON.stringify({name,email,picture}))` | 2026-04-11 |
| Active year tab | Has class `bg-brand-600 text-white` | `toHaveClass(/bg-brand-600/)` | 2026-04-11 |
| Inactive year tab | Has class `bg-gray-800 text-gray-400` | `toHaveClass(/bg-gray-800/)` | 2026-04-11 |
| Dynamic show cards | Use prefix data-testid selector | `a[data-testid^="show-card-"]` | 2026-04-11 |
| Show detail URL | Matches `/show/:id` (numeric) | `toHaveURL(/\/show\/\d+/)` | 2026-04-11 |

| Add-to-list confirmation | Option text gets "✓" appended after adding show to list | `expect(option).toContainText('My Top Shows✓')` | 2026-04-12 |
| Create list inline form | No modal — inline form on /lists page with testId on input + submit | Use `create-list-input` + `create-list-submit` directly | 2026-04-12 |

## Known Limitations

| Issue | Description | Workaround | Discovered |
| ----- | ----------- | ---------- | ---------- |
| 2026 tab has 1 page | Year 2026 only has 1 page — pagination disabled | Use year-tab-2024 for pagination tests (2 pages) | 2026-04-11 |
| Nav label mismatch | Instructions say "Lists" but app renders "My Lists" | Use actual text "My Lists" in assertions | 2026-04-11 |
| No testId on user dropdown | User menu dropdown panel has no data-testid | Use `getByRole('button', { name: 'Sign Out' })` | 2026-04-11 |
| No testId on footer | Footer element has no data-testid | Use `locator('footer')` or `getByRole('contentinfo')` | 2026-04-11 |
| Favorites confirmation is button toggle | No toast after adding favorite — confirmation is btn-add-favorite changing to btn-remove-favorite | Assert `getByTestId('btn-remove-favorite')` is visible | 2026-04-11 |
| Show card IDs are numeric & dynamic | Show cards use dynamic IDs (e.g. show-card-169) — not stable across test runs if data changes | Use `show-grid a[data-testid^="show-card-"]` pattern to get first card dynamically | 2026-04-11 |
| List count badge (detail page) | No data-testid on count badge SPAN in list detail page | Use `getByTestId('page-list-detail').getByText(/\d+ shows?/)` | 2026-04-12 |
| Show names in list detail | No data-testid on show name/title within list detail | Verify show presence via `remove-show-{showId}` button visibility instead | 2026-04-12 |
| List card UUIDs are dynamic | List cards use UUID-based testIds — not predictable | Find list cards by name text: `getByRole('link', { name: /My Top Shows/ })` | 2026-04-12 |
| Count grammar singular | "1 show" (singular) vs "2 shows" (plural) | Use regex `/\d+ shows?/` or specific "1 show" / "2 shows" strings | 2026-04-12 |
