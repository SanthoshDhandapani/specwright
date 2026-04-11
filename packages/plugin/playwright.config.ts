import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';
import dotenv from 'dotenv';

// Load environment variables from e2e-tests/.env.testing (canonical source of truth)
// Falls back to root .env for any vars not set above (e.g. CI overrides)
dotenv.config({ path: 'e2e-tests/.env.testing', override: true });
dotenv.config({ override: false });

// Auth strategy: determines whether to run auth setup and use storageState
const authStrategy = process.env.AUTH_STRATEGY || 'email-password';
const hasAuth = authStrategy !== 'none';

// Chrome arguments: use CHROME_ARGS env var (comma-separated) or sensible defaults
const chromeArgs = process.env.CHROME_ARGS
  ? process.env.CHROME_ARGS.split(',')
      .map((a) => a.trim())
      .filter(Boolean)
  : ['--no-sandbox', '--disable-dev-shm-usage'];

// Shared launch options
const defaultLaunchOptions = {
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: chromeArgs,
};

// Define BDD configuration
const testDir = defineBddConfig({
  features: 'e2e-tests/features/playwright-bdd/**/*.feature',
  steps: [
    'e2e-tests/features/playwright-bdd/**/*.{js,ts}',
    'e2e-tests/features/playwright-bdd/shared/*.{js,ts}',
    'e2e-tests/playwright/fixtures.js',
  ],
});

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir,
  /* Global setup - runs once before all test projects */
  globalSetup: './e2e-tests/playwright/global.setup.js',
  /* Global teardown - runs once after all test projects complete */
  globalTeardown: './e2e-tests/playwright/global.teardown.js',
  /* Default: run scenarios in parallel. Use @serial-execution tag to opt out. */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  timeout: parseInt(process.env.TEST_TIMEOUT || '90000'),
  /* Workers */
  workers: process.env.CI ? 4 : 5,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['json', { outputFile: 'reports/json/results.json' }] as const,
    cucumberReporter('json', { outputFile: 'reports/cucumber-bdd/report.json' }),
    // Console output: "line" on CI, "list" locally
    ...(process.env.CI ? [['line'] as const] : [['list'] as const]),
    // HTML reporter: always locally, on CI only when GENERATE_REPORTS is set
    ...(!process.env.CI || process.env.GENERATE_REPORTS
      ? [['html', { outputFolder: process.env.PLAYWRIGHT_REPORT_DIR || 'reports/playwright' }] as const]
      : []),
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    /* Configure headless mode based on environment variable */
    headless: process.env.HEADLESS !== 'false',

    /* Collect trace when retrying the failed test. */
    trace: process.env.ENABLE_TRACING === 'true' ? 'on-first-retry' : 'off',

    /* Take screenshot on failure */
    screenshot: process.env.ENABLE_SCREENSHOTS === 'true' ? 'only-on-failure' : 'off',

    /* Record video on failure */
    video: process.env.ENABLE_VIDEO_RECORDING === 'true' ? 'retain-on-failure' : 'off',
  },

  /* Configure projects */
  projects: [
    // Setup project - creates authentication state (skipped when AUTH_STRATEGY=none)
    ...(hasAuth
      ? [
          {
            name: 'setup',
            testDir: './e2e-tests/playwright',
            testMatch: '**/auth.setup.js',
            use: {
              ...devices['Desktop Chrome'],
              launchOptions: defaultLaunchOptions,
            },
          },
        ]
      : []),

    // Authentication tests - run with clean state (no dependencies, no storageState)
    ...(hasAuth
      ? [
          {
            name: 'auth-tests',
            testMatch: '**/@Authentication/*.spec.js',
            use: {
              ...devices['Desktop Chrome'],
              launchOptions: defaultLaunchOptions,
              // Clean state for testing login/logout functionality
            },
          },
        ]
      : []),

    // Serial execution — features tagged @serial-execution (non-workflow) run with 1 worker.
    // Browser page is reused across scenarios within the same feature file.
    // grepInvert excludes workflow tags so they run in their dedicated lanes below.
    {
      name: 'serial-execution',
      testMatch: '**/*.spec.js',
      testIgnore: '**/@Authentication/*.spec.js',
      grep: /@serial-execution/,
      grepInvert: /@precondition|@workflow-consumer/,
      fullyParallel: false,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: defaultLaunchOptions,
        ...(hasAuth
          ? { storageState: 'e2e-tests/playwright/auth-storage/.auth/user.json' }
          : {}),
      },
      ...(hasAuth ? { dependencies: ['setup'] } : {}),
    },

    // Precondition — workflow setup features tagged @precondition.
    // Runs serial (1 worker) to ensure all preconditions complete before consumers start.
    // Filesystem ordering via @0-Precondition/ directory prefix guarantees correct sequence.
    {
      name: 'precondition',
      testMatch: '**/*.spec.js',
      testIgnore: '**/@Authentication/*.spec.js',
      grep: /@precondition/,
      fullyParallel: false,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: defaultLaunchOptions,
        ...(hasAuth
          ? { storageState: 'e2e-tests/playwright/auth-storage/.auth/user.json' }
          : {}),
      },
      ...(hasAuth ? { dependencies: ['setup'] } : {}),
    },

    // Workflow consumers — features tagged @workflow-consumer.
    // Runs parallel AFTER all preconditions complete, consuming shared test data
    // written by precondition to e2e-tests/playwright/test-data/{scope}.json.
    {
      name: 'workflow-consumers',
      testMatch: '**/*.spec.js',
      testIgnore: '**/@Authentication/*.spec.js',
      grep: /@workflow-consumer/,
      fullyParallel: true,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: defaultLaunchOptions,
        ...(hasAuth
          ? { storageState: 'e2e-tests/playwright/auth-storage/.auth/user.json' }
          : {}),
      },
      ...(hasAuth ? { dependencies: ['precondition'] } : {}),
    },

    // Run single workflow — serial (1 worker), filesystem ordering via @0-/@1- prefixes.
    // ONLY used via explicit targeted scripts (e.g. pnpm test:bdd:bookings).
    // NOT included in pnpm test:bdd — the full run uses precondition → workflow-consumers instead.
    {
      name: 'run-workflow',
      testMatch: '**/@Workflows/**/*.spec.js',
      fullyParallel: false,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: defaultLaunchOptions,
        ...(hasAuth
          ? { storageState: 'e2e-tests/playwright/auth-storage/.auth/user.json' }
          : {}),
      },
      ...(hasAuth ? { dependencies: ['setup'] } : {}),
    },

    // Chromium project — Playwright Test MCP compatibility alias.
    // Runs generated seed.spec.js from e2e-tests/playwright/generated/ directly — no bddgen needed.
    // Seed files inject their own auth via localStorage; no storageState dependency required.
    {
      name: 'chromium',
      testDir: './e2e-tests/playwright/generated',
      testMatch: '**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: defaultLaunchOptions,
      },
    },

    // Main BDD tests — everything not serial, precondition, consumer, or auth. Runs parallel.
    {
      name: 'main-e2e',
      testMatch: '**/*.spec.js',
      testIgnore: '**/@Authentication/*.spec.js',
      grepInvert: /@serial-execution|@precondition|@workflow-consumer/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: defaultLaunchOptions,
        ...(hasAuth
          ? { storageState: 'e2e-tests/playwright/auth-storage/.auth/user.json' }
          : {}),
      },
      ...(hasAuth ? { dependencies: ['setup'] } : {}),
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.BASE_URL?.startsWith('http://localhost')
    ? {
        command: 'pnpm dev',
        url: process.env.BASE_URL || 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120 * 1000,
      }
    : undefined,
});
