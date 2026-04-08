import * as fs from "fs";
import * as path from "path";
import { execSync, exec } from "child_process";

export interface EnvVars {
  BASE_URL: string;
  TEST_ENV: string;
  TEST_USERNAME?: string;
  TEST_PASSWORD?: string;
  [key: string]: string | undefined;
}

export interface InstructionStep {
  action: string;
}

export interface InstructionCard {
  mode: "explorer" | "csv" | "virtuoso";
  moduleName: string;
  category: "@Modules" | "@Workflows";
  subModules: string[];
  fileName: string;
  pageURL?: string;
  steps: string[];
  filePath?: string;
  suitName?: string;
  jiraURL?: string;
  explore: boolean;
  runExploredCases: boolean;
  runGeneratedCases: boolean;
}

export type ProjectState = "none" | "bootstrapping" | "ready" | "error";

interface BootstrapResult {
  success: boolean;
  error?: string;
}

export class ProjectService {
  private resourcesDir: string;

  constructor(resourcesDir: string) {
    this.resourcesDir = resourcesDir;
  }

  async bootstrap(
    projectPath: string,
    options: { skipAuth?: boolean } = {}
  ): Promise<BootstrapResult> {
    try {
      // Ensure directory exists
      fs.mkdirSync(projectPath, { recursive: true });

      // Ensure a package.json exists (the plugin merges into it, doesn't create from scratch)
      const pkgPath = path.join(projectPath, "package.json");
      if (!fs.existsSync(pkgPath)) {
        fs.writeFileSync(
          pkgPath,
          JSON.stringify(
            {
              name: path.basename(projectPath),
              version: "1.0.0",
              description: "Playwright BDD E2E test suite (scaffolded by Specwright)",
            },
            null,
            2
          ),
          "utf-8"
        );
      }

      // Run @specwright/plugin init — installs the full E2E framework:
      // .claude/ (8 agents, 8 skills, 5 rules), e2e-tests/ (fixtures, helpers,
      // shared steps, data config), playwright.config.ts, .mcp.json, README-TESTING.md
      const authFlag = "--skip-auth";

      // Resolve the plugin's install.sh from the workspace (or fall back to npx)
      // Desktop app uses --non-interactive to skip all prompts
      let pluginCmd: string;
      try {
        const pluginDir = path.dirname(
          require.resolve("@specwright/plugin/cli.js")
        );
        pluginCmd = `node "${path.join(pluginDir, "cli.js")}" init "${projectPath}" ${authFlag} --non-interactive`;
      } catch {
        // Plugin not in workspace — use npx (downloads from npm)
        pluginCmd = `npx @specwright/plugin init "${projectPath}" ${authFlag} --non-interactive`;
      }

      execSync(pluginCmd, {
        cwd: projectPath,
        shell: true,
        stdio: "pipe",
        timeout: 120_000,
      });

      // Install dependencies in background — non-blocking so the app doesn't freeze.
      // Use --ignore-scripts and set npm_config_ignore_scripts to skip ALL lifecycle
      // scripts (including "prepare") — some packages like jwt-decode ship broken
      // "prepare: husky install" that fails in non-dev environments.
      exec("npm install --ignore-scripts", {
        cwd: projectPath,
        shell: true,
        timeout: 120_000,
        env: { ...process.env, npm_config_ignore_scripts: "true" },
      }, (err) => {
        if (err) {
          console.warn("[bootstrap] npm install failed (non-fatal):", err.message);
        }
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Parse a .env file into key-value pairs.
   * Skips comments and empty lines.
   */
  private parseEnvFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
    return result;
  }

  /**
   * Read testing-related env vars only.
   * Primary source: e2e-tests/.env.testing (plugin-installed template)
   * Fallback: .env for system keys (BASE_URL, TEST_ENV, TEST_USERNAME, TEST_PASSWORD)
   * Never exposes app-specific vars (VITE_*, API keys, etc.)
   */
  readEnv(projectPath: string): EnvVars {
    const testingEnvPath = path.join(projectPath, "e2e-tests/.env.testing");
    const rootEnvPath = path.join(projectPath, ".env");

    // Start with minimal defaults — only BASE_URL is always needed
    const result: EnvVars = { BASE_URL: "", TEST_ENV: "" };

    // Read from .env.testing (primary — all testing vars)
    const testingVars = this.parseEnvFile(testingEnvPath);
    for (const [key, val] of Object.entries(testingVars)) {
      result[key] = val;
    }

    // Fall back to .env ONLY for the 4 system keys if not already set from .env.testing
    const systemKeys = ["BASE_URL", "TEST_ENV", "TEST_USERNAME", "TEST_PASSWORD"];
    const rootVars = this.parseEnvFile(rootEnvPath);
    for (const key of systemKeys) {
      if (!result[key] && rootVars[key]) {
        result[key] = rootVars[key];
      }
    }

    return result;
  }

  /**
   * Write testing env vars to e2e-tests/.env.testing.
   * Never modifies the project's root .env (protects app secrets).
   */
  writeEnv(projectPath: string, vars: EnvVars): void {
    const testingEnvPath = path.join(projectPath, "e2e-tests/.env.testing");
    fs.mkdirSync(path.dirname(testingEnvPath), { recursive: true });

    const lines: string[] = ["# E2E Testing Environment — managed by Specwright"];
    for (const [key, val] of Object.entries(vars)) {
      if (val !== undefined && val !== null) {
        lines.push(`${key}=${val}`);
      }
    }
    fs.writeFileSync(testingEnvPath, lines.join("\n") + "\n", "utf-8");
  }

  /** Resolve the instructions.js path for a project. */
  private resolveInstructionsPath(projectPath: string): string {
    return path.join(projectPath, "e2e-tests/instructions.js");
  }

  readInstructions(projectPath: string): InstructionCard[] {
    const filePath = this.resolveInstructionsPath(projectPath);
    if (!fs.existsSync(filePath)) return [];

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      // Extract the array from ESM or CJS export (greedy match for full array)
      const esmMatch = raw.match(/export\s+default\s+(\[[\s\S]*\]);?\s*$/m);
      const cjsMatch = raw.match(/module\.exports\s*=\s*(\[[\s\S]*\]);?\s*$/m);
      const match = esmMatch || cjsMatch;
      if (!match) return [];

      // The file uses JS syntax (single quotes, unquoted keys) — not valid JSON.
      // Convert to valid JSON: replace single quotes with double quotes, add quotes to keys.
      let jsArray = match[1].trim();
      // Remove trailing semicolon if present
      if (jsArray.endsWith(";")) jsArray = jsArray.slice(0, -1);

      // Use Function() to safely evaluate the JS array literal
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const evaluated = new Function(`return ${jsArray}`)() as Record<string, unknown>[];

      // Map the pipeline format to InstructionCard format
      return evaluated.map((entry) => ({
        mode: ((entry.mode as string) || "explorer") as InstructionCard["mode"],
        moduleName: (entry.moduleName as string) || "",
        category: ((entry.category as string) || "@Modules") as "@Modules" | "@Workflows",
        subModules: (entry.subModuleName as string[]) || (entry.subModules as string[]) || [],
        fileName: (entry.fileName as string) || "",
        pageURL: (entry.pageURL as string) || "",
        steps: (entry.instructions as string[]) || (entry.steps as string[]) || [],
        filePath: (entry.filePath as string) || "",
        suitName: (entry.suitName as string) || "",
        jiraURL: (entry.jiraURL as string) || (entry.jira as string) || "",
        explore: entry.explore === true,
        runExploredCases: entry.runExploredCases === true,
        runGeneratedCases: entry.runGeneratedCases === true,
      }));
    } catch (err) {
      console.error("[ProjectService] Failed to read instructions:", err);
      return [];
    }
  }

  writeInstructions(projectPath: string, cards: InstructionCard[]): void {
    const filePath = this.resolveInstructionsPath(projectPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write as proper JS object syntax (unquoted keys) instead of JSON
    const jsArray = this.cardsToJsSource(cards);

    // Detect if the existing file uses ESM or CJS, default to ESM
    let useEsm = true;
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf-8");
      useEsm = !existing.includes("module.exports");
    }
    const content = useEsm
      ? `// Auto-generated by Specwright — edit or regenerate via the UI\nexport default ${jsArray};\n`
      : `// Auto-generated by Specwright — edit or regenerate via the UI\nmodule.exports = ${jsArray};\n`;
    fs.writeFileSync(filePath, content, "utf-8");
  }

  /** Convert InstructionCard[] to a JS source string with unquoted keys and single quotes. */
  private cardsToJsSource(cards: InstructionCard[]): string {
    if (cards.length === 0) return "[]";

    const q = (val: string): string => `'${val.replace(/'/g, "\\'")}'`;

    const entries = cards.map((card) => {
      const lines: string[] = [];
      lines.push(`  {`);
      lines.push(`    mode: ${q(card.mode)},`);
      lines.push(`    moduleName: ${q(card.moduleName)},`);
      lines.push(`    category: ${q(card.category)},`);
      lines.push(`    subModuleName: [${card.subModules.map(s => q(s)).join(", ")}],`);
      lines.push(`    fileName: ${q(card.fileName)},`);
      if (card.pageURL) lines.push(`    pageURL: ${q(card.pageURL)},`);
      if (card.filePath) lines.push(`    filePath: ${q(card.filePath)},`);
      if (card.suitName) lines.push(`    suitName: ${q(card.suitName)},`);
      if (card.jiraURL) lines.push(`    jiraURL: ${q(card.jiraURL)},`);
      if (card.steps.length > 0) {
        lines.push(`    instructions: [`);
        for (const step of card.steps) {
          lines.push(`      ${q(step)},`);
        }
        lines.push(`    ],`);
      }
      lines.push(`    explore: ${card.explore},`);
      lines.push(`    runExploredCases: ${card.runExploredCases},`);
      lines.push(`    runGeneratedCases: ${card.runGeneratedCases},`);
      lines.push(`  }`);
      return lines.join("\n");
    });

    return `[\n${entries.join(",\n")}\n]`;
  }

  isBootstrapped(projectPath: string): boolean {
    return (
      fs.existsSync(path.join(projectPath, "package.json")) &&
      fs.existsSync(path.join(projectPath, "playwright.config.ts")) &&
      fs.existsSync(path.join(projectPath, "e2e-tests/playwright/fixtures.js"))
    );
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  /** Read example templates from instructions.example.js */
  readExampleTemplates(projectPath: string): (InstructionCard & { templateName: string })[] {
    const filePath = path.join(projectPath, "e2e-tests/instructions.example.js");
    return this.parseTemplateFile(filePath);
  }

  /** Read custom user templates from instructions.custom-templates.js */
  readCustomTemplates(projectPath: string): (InstructionCard & { templateName: string })[] {
    const filePath = path.join(projectPath, "e2e-tests/instructions.custom-templates.js");
    return this.parseTemplateFile(filePath);
  }

  /** Write custom templates to instructions.custom-templates.js */
  writeCustomTemplates(projectPath: string, templates: (InstructionCard & { templateName: string })[]): void {
    const filePath = path.join(projectPath, "e2e-tests/instructions.custom-templates.js");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (templates.length === 0) {
      fs.writeFileSync(filePath, "// Custom templates saved by Specwright\nexport default [];\n", "utf-8");
      return;
    }

    const q = (val: string): string => `'${val.replace(/'/g, "\\'")}'`;
    const entries = templates.map((tmpl) => {
      const lines: string[] = [];
      lines.push(`  {`);
      lines.push(`    templateName: ${q(tmpl.templateName)},`);
      lines.push(`    mode: ${q(tmpl.mode)},`);
      lines.push(`    moduleName: ${q(tmpl.moduleName)},`);
      lines.push(`    category: ${q(tmpl.category)},`);
      lines.push(`    subModuleName: [${tmpl.subModules.map(s => q(s)).join(", ")}],`);
      lines.push(`    fileName: ${q(tmpl.fileName)},`);
      if (tmpl.pageURL) lines.push(`    pageURL: ${q(tmpl.pageURL)},`);
      if (tmpl.steps.length > 0) {
        lines.push(`    instructions: [`);
        for (const step of tmpl.steps) {
          lines.push(`      ${q(step)},`);
        }
        lines.push(`    ],`);
      }
      lines.push(`    explore: ${tmpl.explore},`);
      lines.push(`    runExploredCases: ${tmpl.runExploredCases},`);
      lines.push(`    runGeneratedCases: ${tmpl.runGeneratedCases},`);
      lines.push(`  }`);
      return lines.join("\n");
    });

    const content = `// Custom templates saved by Specwright\nexport default [\n${entries.join(",\n")}\n];\n`;
    fs.writeFileSync(filePath, content, "utf-8");
  }

  /** Parse a JS file that exports an array of instruction configs (example or custom templates) */
  private parseTemplateFile(filePath: string): (InstructionCard & { templateName: string })[] {
    if (!fs.existsSync(filePath)) return [];

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const esmMatch = raw.match(/export\s+default\s+(\[[\s\S]*\]);?\s*$/m);
      const cjsMatch = raw.match(/module\.exports\s*=\s*(\[[\s\S]*\]);?\s*$/m);
      const match = esmMatch || cjsMatch;
      if (!match) return [];

      let jsArray = match[1].trim();
      if (jsArray.endsWith(";")) jsArray = jsArray.slice(0, -1);

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const evaluated = new Function(`return ${jsArray}`)() as Record<string, unknown>[];

      return evaluated.map((entry) => ({
        templateName: (entry.templateName as string) || (entry.moduleName as string) || "Untitled",
        mode: ((entry.mode as string) || "explorer") as InstructionCard["mode"],
        moduleName: (entry.moduleName as string) || "",
        category: ((entry.category as string) || "@Modules") as "@Modules" | "@Workflows",
        subModules: (entry.subModuleName as string[]) || (entry.subModules as string[]) || [],
        fileName: (entry.fileName as string) || "",
        pageURL: (entry.pageURL as string) || "",
        steps: (entry.instructions as string[]) || (entry.steps as string[]) || [],
        filePath: (entry.filePath as string) || "",
        suitName: (entry.suitName as string) || "",
        jiraURL: (entry.jiraURL as string) || "",
        explore: entry.explore === true,
        runExploredCases: entry.runExploredCases === true,
        runGeneratedCases: entry.runGeneratedCases === true,
      }));
    } catch (err) {
      console.error(`[ProjectService] Failed to parse template file ${filePath}:`, err);
      return [];
    }
  }

  /**
   * Load the orchestrator system prompt for the pipeline.
   * Priority:
   *   1. Target project's .claude/skills/e2e-automate/SKILL.md (the full pipeline instructions)
   *   2. Target project's .claude/agents/orchestrator.md
   *   3. Bundled resources/agents/orchestrator.md
   *   4. Fallback
   */
  loadOrchestratorPrompt(projectPath?: string): string {
    if (projectPath) {
      // Priority 1: The e2e-automate skill IS the orchestrator
      const skillPaths = [
        path.join(projectPath, ".claude/skills/e2e-automate/SKILL.md"),
        path.join(projectPath, ".claude_skills/e2e-automate/SKILL.md"),
      ];
      for (const p of skillPaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, "utf-8");
          const body = raw.replace(/^---[\s\S]*?---\n?/, "").trim();
          // Prepend context so Claude knows it's running inside Specwright desktop app
          return `You are running inside Specwright, an E2E test automation desktop app. The user has configured test instructions via the UI. Execute the pipeline below.\n\n${body}`;
        }
      }

      // Priority 2: Agent file
      const agentPaths = [
        path.join(projectPath, ".claude/agents/orchestrator.md"),
        path.join(projectPath, ".claude_agents/orchestrator.md"),
      ];
      for (const p of agentPaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, "utf-8");
          return raw.replace(/^---[\s\S]*?---\n?/, "").trim();
        }
      }
    }

    // Priority 3: Bundled resources
    const mdPath = path.join(this.resourcesDir, "agents", "orchestrator.md");
    if (fs.existsSync(mdPath)) {
      const raw = fs.readFileSync(mdPath, "utf-8");
      return raw.replace(/^---[\s\S]*?---\n?/, "").trim();
    }

    return "You are a helpful test automation assistant. Read e2e-tests/instructions.js and execute the E2E test automation pipeline.";
  }

  // ── Scaffold templates ─────────────────────────────────────────────────────

  private writeTemplate(base: string, relPath: string, content: string): void {
    const fullPath = path.join(base, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content, "utf-8");
    }
  }

  private packageJsonTemplate(): string {
    return JSON.stringify(
      {
        name: "e2e-tests",
        version: "1.0.0",
        description: "Playwright BDD E2E test suite (scaffolded by Specwright)",
        scripts: {
          "test:bdd": "bddgen && playwright test",
          "test:playwright": "playwright test",
          "report:playwright": "playwright show-report",
        },
        devDependencies: {
          "@playwright/test": "^1.49.0",
          "@faker-js/faker": "^9.0.0",
          "playwright-bdd": "^8.4.2",
          dotenv: "^16.4.7",
        },
      },
      null,
      2
    );
  }

  private playwrightConfigTemplate(): string {
    return `import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import * as dotenv from "dotenv";

dotenv.config();

const bddConfig = defineBddConfig({
  features: "e2e-tests/features/playwright-bdd/**/*.feature",
  steps: [
    "e2e-tests/features/playwright-bdd/**/*.steps.js",
    "e2e-tests/features/playwright-bdd/shared/*.js",
  ],
  outputDir: ".features-gen",
});

export default defineConfig({
  testDir: ".features-gen",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: "**/global.setup.js" },
    {
      name: "e2e",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    { name: "teardown", testMatch: "**/global.teardown.js" },
  ],
  globalSetup: undefined,
  globalTeardown: undefined,
});
`;
  }

  private envTemplate(): string {
    return `BASE_URL=https://app.example.com
TEST_ENV=qat
`;
  }

  private gitignoreTemplate(): string {
    return `node_modules/
.features-gen/
playwright-report/
test-results/
e2e-tests/playwright/auth-storage/.auth/
e2e-tests/playwright/test-data/globalTestData.json
.cleanup-done
`;
  }

  private fixturesTemplate(): string {
    return `import { test as base, createBdd } from "playwright-bdd";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Extended test fixtures for Specwright E2E tests.
 * Import { Given, When, Then, Before, After, expect } from this file in all step definitions.
 */
export const test = base.extend({
  testData: async ({}, use) => {
    const data = {};
    await use(data);
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
export { expect } from "@playwright/test";
`;
  }

  private globalSetupTemplate(): string {
    return `import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const MARKER = path.resolve(".cleanup-done");
const DATA_FILE = path.resolve("e2e-tests/playwright/test-data/globalTestData.json");

test("global setup", async () => {
  if (!fs.existsSync(MARKER)) {
    // New run — clean up leftover test data
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(MARKER, new Date().toISOString(), "utf-8");
  }
  // If marker exists, a run is already in progress — preserve data
});
`;
  }

  private globalTeardownTemplate(): string {
    return `import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const MARKER = path.resolve(".cleanup-done");

test("global teardown", async () => {
  if (fs.existsSync(MARKER)) fs.unlinkSync(MARKER);
});
`;
  }

  private navigationStepsTemplate(): string {
    return `import { Given, When, Then } from "e2e-tests/playwright/fixtures.js";

Given("I navigate to {string}", async ({ page }, url) => {
  await page.goto(url);
});

Given("I am on the {string} page", async ({ page }, pageName) => {
  const baseUrl = process.env.BASE_URL ?? "";
  const routes = {
    home: "/",
    dashboard: "/dashboard",
    login: "/login",
  };
  const route = routes[pageName.toLowerCase()] ?? \`/\${pageName.toLowerCase()}\`;
  await page.goto(\`\${baseUrl}\${route}\`);
});

Then("I should see the page title {string}", async ({ page }, title) => {
  await page.waitForSelector(\`text=\${title}\`, { timeout: 10000 });
});
`;
  }

  private commonStepsTemplate(): string {
    return `import { Given, When, Then, expect } from "e2e-tests/playwright/fixtures.js";

When("I click {string}", async ({ page }, text) => {
  await page.getByText(text, { exact: false }).first().click();
});

When("I fill {string} with {string}", async ({ page }, label, value) => {
  await page.getByLabel(label).fill(value);
});

Then("I should see {string}", async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then("I should not see {string}", async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).not.toBeVisible();
});
`;
  }

  private globalHooksTemplate(): string {
    return `import { Before, After } from "e2e-tests/playwright/fixtures.js";

// Clear per-scenario test data before each scenario
Before(async ({ testData }) => {
  Object.keys(testData).forEach((k) => delete testData[k]);
});
`;
  }

  private instructionsTemplate(): string {
    return `// Auto-generated by Specwright — edit or regenerate via the UI\nmodule.exports = [];\n`;
  }
}
