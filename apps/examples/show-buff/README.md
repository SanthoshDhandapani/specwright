# ShowBuff — Specwright Example App

A TV show discovery app built to demonstrate Specwright's AI-powered E2E test generation.

## Features

- Browse top TV shows by premiere year (2022, 2023, 2024, 2025)
- Show detail pages with cast, images, synopsis
- Google Sign-In with OAuth
- Protected favorites and watchlist (requires sign-in)
- Pagination support
- All interactive elements have `data-testid` for reliable E2E testing

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. TVMaze API is free — no API key needed for public endpoints

# 3. (Optional) Get a Google OAuth Client ID
# Visit: https://console.cloud.google.com/apis/credentials

# 4. Configure environment
cp .env.example .env
# Edit .env with your Google OAuth Client ID (optional)

# 5. Start the app
pnpm dev
# Opens at http://localhost:5173
```

## Specwright Demo

This app is designed to be the demo target for Specwright. Here's how to generate E2E tests:

### Option 1: Specwright Desktop App

1. Open Specwright desktop app
2. Select this project folder (`apps/example-movie-app`)
3. Templates panel shows example instructions — click "Insert" on any
4. Click "Generate" — the AI explores the app, discovers selectors, generates BDD tests

### Option 2: Claude Code CLI

```bash
# Install the Specwright plugin
bash ../../packages/plugin/install.sh

# Copy example instructions
cp e2e-tests/instructions.example.js e2e-tests/instructions.js

# Run the pipeline
claude
/e2e-automate
```

### Option 3: Claude Desktop + MCP

Register the MCP server in Claude Desktop settings, then use `e2e_configure`, `e2e_explore`, `e2e_plan` tools.

## What Gets Generated

Specwright generates Playwright BDD tests organized by module:

```
e2e-tests/features/playwright-bdd/
├── @Modules/
│   ├── @ShowListing/            # Grid, year filter, pagination
│   ├── @ShowDetail/             # Detail view, cast, images
│   └── @Authentication/        # Google sign-in/sign-out
└── @Workflows/
    ├── @UserJourney/           # Sign in → browse → favorite → watchlist
    ├── @ShowDiscovery/         # Cross-year comparison
    └── @AuthProtectedFlow/     # Auth gating across modules
```

## Data Source

TV show data from [TVMaze](https://www.tvmaze.com/). Free API, no credit card or API key required.

## License

MIT
