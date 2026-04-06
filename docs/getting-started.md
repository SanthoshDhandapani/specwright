# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 9+
- [Claude Code CLI](https://claude.ai/code)

## Option 1: Install the Plugin (into your existing app)

```bash
# From your React project root:
bash /path/to/specwright/packages/plugin/install.sh

# Install dependencies
pnpm install
pnpm exec playwright install

# Run authentication tests
pnpm test:bdd:auth
```

## Option 2: Use the Desktop App

```bash
git clone https://github.com/specwright/specwright.git
cd specwright
pnpm install
pnpm dev
```

1. Set your project path in the left panel
2. Configure your app's base URL and credentials
3. Add a test config entry in the Instructions Builder
4. Click Run to start the pipeline

## Option 3: Use Claude Code CLI Skills

After installing the plugin:

```bash
# Full automation pipeline
/e2e-automate

# Explore a page and generate a test plan
/e2e-plan http://localhost:5173/home

# Generate BDD files from a plan
/e2e-generate e2e-tests/plans/homepage-plan.md

# Auto-fix failing tests
/e2e-heal
```

## Next Steps

- [Plugin Installation Guide](plugin-installation.md)
- [Desktop App Guide](desktop-app.md)
- [Agent Pipeline Architecture](agent-pipeline.md)
