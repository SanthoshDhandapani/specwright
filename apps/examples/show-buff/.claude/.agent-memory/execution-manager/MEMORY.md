# Execution Manager Memory

## Module → Source Path Mappings

| E2E Module | Source Path | Verified |
| ---------- | ----------- | -------- |

## Selector Patterns

## Data Flow

- **`@FavoritesWorkflow`**: Precondition writes `{ showTitle, movieStoreData }` to `e2e-tests/playwright/test-data/favoritesworkflow.json`. Consumer reads and restores `movieStoreData` to `specwright-show-data` localStorage key before navigating to `/favorites`, so Zustand hydrates correctly.
- **`specwright-show-data`**: Zustand movieStore persistence key. Holds `{ favorites: number[], watchlist: number[], customLists: [] }`.
- **`specwright-show-user`**: OAuth auth key in localStorage. Populated by auth setup, persisted in storageState.

## Known Risks

- **Fresh browser context loses Zustand state**: `workflow-consumers` project storageState only captures auth keys (set during auth setup). Any in-test localStorage writes by precondition (favorites, watchlist) are NOT carried over. Always save + restore via scoped test data pattern (see Healer Memory).
- **FavoritesPage empty state**: If `favorites.length === 0` in movieStore, the page renders `favorites-empty-state` instead of `favorites-grid`. Test will fail on `getByTestId('favorites-grid')`. Root cause is always missing localStorage restore.
- **Multi-step precondition race condition**: When a workflow has multiple `@precondition`-tagged features (e.g. `@ListWorkflow` with `@0-CreateList` AND `@1-AddShows`), the `precondition` project runs them concurrently (`fullyParallel: true`). If `@1-AddShows` starts before `@0-CreateList` finishes writing `listworkflow.json` (with `movieStoreData`), the Zustand store won't be restored and `AddToListDropdown` will show "No custom lists yet". Fix: `I load predata from {string}` now polls with 60 s timeout. Future multi-step workflows should consider using sequential ordering (`run-workflow` project) or stagger using polling.
- **`AddToListDropdown` needs `movieStoreData` with `customLists` populated**: The dropdown reads from Zustand `customLists` which is only populated if `movieStoreData` was restored to localStorage before the app hydrated. Always ensure the precondition saves localStorage AFTER creating the list, and the consumer restores it BEFORE navigating to the show detail page.
