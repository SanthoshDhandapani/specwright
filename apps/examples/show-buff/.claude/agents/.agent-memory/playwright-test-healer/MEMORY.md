# Healer Memory

## Project Conventions

- **Workflow consumers need localStorage state restored**: The `workflow-consumers` project creates a fresh browser context from auth-only storageState. Any app state written to localStorage by precondition (e.g. Zustand favorites store `specwright-show-data`) is NOT present in the consumer context. Fix pattern: capture localStorage in precondition step → save to scoped test data → restore in consumer `Given I load predata from {string}` step before navigation via `page.evaluate(() => localStorage.setItem(...))`.
- **Concurrent preconditions can race on shared scoped data**: When a workflow has multiple precondition scenarios (e.g. `@0-CreateList` + `@1-AddShows`), the `precondition` project runs them with `fullyParallel: true`. If scenario B depends on scenario A's output (e.g. needs `movieStoreData` from A's JSON file), B will fail if it reads the file before A writes it. Fix: the `I load predata from {string}` shared step now polls (2 s interval, 60 s timeout) until `movieStoreData` is present before proceeding.
- **AddToListDropdown shows "No custom lists yet" when Zustand customLists is empty**: If `movieStoreData` was not restored to localStorage before the app hydrates, `useMovieStore.customLists` will be `[]`. The dropdown will show the empty-state paragraph instead of list buttons. Root cause is always missing/stale `movieStoreData` in predata.

## Module Selector Patterns

## Anti-Patterns

| Pattern | Why It Fails | Alternative |
| ------- | ------------ | ----------- |
| Reading predata without waiting when sibling precondition creates it | Race condition — sibling precondition may not have written the file yet | Use `waitForScopedTestData()` (polls until `movieStoreData` is present) |

## Selector Fixes (Most Recent 20)

| Date | Module | Original Selector | Fixed Selector | Reason |
| ---- | ------ | ----------------- | -------------- | ------ |
