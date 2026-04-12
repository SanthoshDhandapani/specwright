# Planner Memory

## Key Selectors

<!-- One table per page/module — added by the planner agent after each exploration session -->
<!-- Format used by agent:
## Key Selectors: <Module> (<url>)
| Element | Selector | Notes |
| ------- | -------- | ----- |
-->

## Navigation Paths

| Module | URL | Key Pages | Discovered |
| ------ | --- | --------- | ---------- |

## Reusable Patterns

| Pattern | Description | Example | Discovered |
| ------- | ----------- | ------- | ---------- |
| clearAuth guard | Always navigate to app origin before clearing localStorage — browsers throw SecurityError on about:blank | See template below | 2026-04-12 |

### `clearAuth()` Template (always use this pattern in seed.spec.js)

```javascript
async function clearAuth(page) {
  const url = page.url();
  if (!url || url === 'about:blank' || !url.startsWith('http')) {
    await page.goto(process.env.BASE_URL || 'http://localhost:5173', { waitUntil: 'commit' });
  }
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.context().clearCookies();
}
```

## Known Limitations

| Issue | Description | Workaround | Discovered |
| ----- | ----------- | ---------- | ---------- |
