# Planner Memory

## Key Selectors: HomePage (https://specwright-show-buff.vercel.app/home)
| Element | Selector | Notes |
| ------- | -------- | ----- |
| Page wrapper | `getByTestId("page-home")` | Main div container |
| Page heading | `getByRole("heading", { name: "Top TV Shows" })` | h1 element |
| Subtitle | `getByText("Popular shows by premiere year")` | p element |
| Header | `getByTestId("header")` | Sticky top header |
| Logo | `getByTestId("header-logo")` | Link to / |
| Nav Home | `getByTestId("header-nav-home")` | Always visible |
| Nav Favorites | `getByTestId("header-nav-favorites")` | Auth-only |
| Nav Watchlist | `getByTestId("header-nav-watchlist")` | Auth-only |
| Nav My Lists | `getByTestId("header-nav-lists")` | Auth-only |
| User menu trigger | `getByTestId("user-menu-trigger")` | Opens dropdown |
| User avatar | `getByTestId("user-avatar")` | Profile picture img |
| User display name | `getByTestId("user-display-name")` | User name text |
| User menu dropdown | `getByTestId("user-menu-dropdown")` | Visible when open |
| Sign Out button | `getByTestId("user-menu-signout")` | Inside dropdown |
| Year tabs container | `getByTestId("year-pagination")` | Contains 4 year buttons |
| Year tab button | `getByTestId("year-tab-{year}")` | Dynamic: year-tab-2026 etc |
| Previous page | `getByTestId("page-prev")` | Disabled on page 1 |
| Next page | `getByTestId("page-next")` | Disabled on last page |
| Page indicator | `getByTestId("page-indicator")` | Shows "Page X of Y" |
| Show grid | `getByTestId("show-grid")` | Grid of show cards |
| Show grid empty | `getByTestId("show-grid-empty")` | No shows found state |
| Show card | `getByTestId("show-card-{id}")` | Link to /show/{id} |
| Show poster | `getByTestId("show-card-poster-{id}")` | Image or placeholder |
| Show title | `getByTestId("show-card-title-{id}")` | h3 element |
| Show rating | `getByTestId("show-card-rating-{id}")` | Star rating |
| Loading spinner | `getByTestId("loading-spinner")` | During data fetch |
| Error message | `getByTestId("error-message")` | On fetch failure |
| Retry button | `getByTestId("retry-button")` | Inside error state |
| Google sign-in | `getByTestId("google-signin-button")` | Unauthenticated state |
| Footer | `locator("footer")` | No testid, use tag selector |
| TVMaze link | `footer.getByRole("link", { name: "TVMaze" })` | href=https://www.tvmaze.com/, target=_blank |
| Show detail page | `getByTestId("page-show-detail")` | On /show/:id route |

## Navigation Paths

| Module | URL | Key Pages | Discovered |
| ------ | --- | --------- | ---------- |
| HomePage | /home (also /) | Show grid, year tabs, page nav | 2026-04-11 |
| Favorites | /favorites | Protected route | 2026-04-11 |
| Watchlist | /watchlist | Protected route | 2026-04-11 |
| Lists | /lists | Protected route | 2026-04-11 |
| List Detail | /lists/:id | Protected route | 2026-04-11 |
| Show Detail | /show/:id | Public route | 2026-04-11 |
| Sign In | /signin | Sign in page | 2026-04-11 |

## Reusable Patterns

| Pattern | Description | Example | Discovered |
| ------- | ----------- | ------- | ---------- |
| OAuth auth inject | Set localStorage key with user object then reload | `localStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify({name,email,picture}))` | 2026-04-11 |
| Dynamic testid match | Show cards use `show-card-{id}` pattern | `locator('[data-testid^="show-card-"]')` | 2026-04-11 |
| Active nav class | Active nav link has `bg-brand-600` class | `toHaveClass(/bg-brand-600/)` | 2026-04-11 |
| Year tab dynamic | 4 years: current, -1, -2, -3 | `year-tab-${new Date().getFullYear()}` | 2026-04-11 |

## Known Limitations

| Issue | Description | Workaround | Discovered |
| ----- | ----------- | ---------- | ---------- |
| API dependency | Show grid depends on external TMDB API | Use 15s timeout for show-grid visibility | 2026-04-11 |
| Dynamic card IDs | Show card testids include API-provided IDs | Use `[data-testid^="show-card-"]` prefix match | 2026-04-11 |
| No form elements | HomePage has no form inputs, dropdowns, or text fields | Skip form-related test cases for this page | 2026-04-11 |
| Home nav maps to / | Header nav Home link navigates to `/` not `/home` | Both routes show HomePage content | 2026-04-11 |
| Active year tab class | Selected year tab has `bg-brand-600`, others have `bg-gray-800` | Same pattern as active nav link | 2026-04-11 |