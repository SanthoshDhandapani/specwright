export type NavItem = { label: string; href: string };
export type NavGroup = { title: string; items: NavItem[] };

export const DOC_NAV: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs/getting-started/introduction" },
      { label: "Installation", href: "/docs/getting-started/installation" },
      { label: "Quick Start", href: "/docs/getting-started/quick-start" },
      { label: "Demo Videos", href: "/docs/getting-started/demo-videos" },
      { label: "Your First Test", href: "/docs/getting-started/first-test" },
      { label: "Choosing Your Interface", href: "/docs/getting-started/choosing-interface" },
      { label: "Updating Specwright", href: "/docs/getting-started/updating-specwright" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { label: "10-Phase Pipeline", href: "/docs/core-concepts/pipeline" },
      { label: "Modules vs Workflows", href: "/docs/core-concepts/modules-vs-workflows" },
      { label: "Agents & Skills", href: "/docs/core-concepts/agents-and-skills" },
      { label: "BDD Test Format", href: "/docs/core-concepts/bdd-format" },
      { label: "Agent Memory", href: "/docs/core-concepts/agent-memory" },
      { label: "Test Data Persistence", href: "/docs/core-concepts/test-data-persistence" },
      { label: "Workflow Patterns", href: "/docs/core-concepts/workflow-patterns" },
    ],
  },
  {
    title: "Interfaces",
    items: [
      { label: "Plugin + CLI", href: "/docs/interfaces/plugin-cli" },
      { label: "Desktop App", href: "/docs/interfaces/desktop-app" },
      { label: "Claude Desktop (MCP)", href: "/docs/interfaces/claude-desktop" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "instructions.js", href: "/docs/configuration/instructions" },
      { label: ".env.testing", href: "/docs/configuration/env-testing" },
      { label: "specwright.json", href: "/docs/configuration/specwright-json" },
      { label: "Auth Strategies", href: "/docs/configuration/auth-strategies" },
      { label: "Field Types", href: "/docs/configuration/field-types" },
    ],
  },
  {
    title: "Reference",
    items: [
      { label: "Agents", href: "/docs/reference/agents" },
      { label: "MCP Tools", href: "/docs/reference/mcp-tools" },
      { label: "Shared Steps", href: "/docs/reference/shared-steps" },
      { label: "Playwright Projects", href: "/docs/reference/playwright-projects" },
      { label: "CLI Commands", href: "/docs/reference/cli-commands" },
      { label: "Performance & Tokens", href: "/docs/reference/performance" },
      { label: "Reports", href: "/docs/reference/reports" },
    ],
  },
  {
    title: "Project Setup",
    items: [
      { label: "Knowledge Base", href: "/docs/project-setup/knowledge-base" },
      { label: "Custom Field Types", href: "/docs/project-setup/custom-field-types" },
      { label: "Custom Shared Steps", href: "/docs/project-setup/custom-shared-steps" },
    ],
  },
  {
    title: "Plugin Creation",
    items: [
      { label: "Overview", href: "/docs/plugin-creation/overview" },
      { label: "Plugin Manifest", href: "/docs/plugin-creation/plugin-manifest" },
      { label: "install.sh", href: "/docs/plugin-creation/install-sh" },
      { label: "Example: plugin-mui", href: "/docs/plugin-creation/example-plugin-mui" },
      { label: "Publishing to npm", href: "/docs/plugin-creation/publishing" },
    ],
  },
  {
    title: "Examples",
    items: [
      { label: "Show-Buff Demo", href: "/docs/examples/show-buff" },
      { label: "Todo App (MUI Plugin)", href: "/docs/examples/todo-app-mui" },
    ],
  },
  {
    title: "Architecture",
    items: [
      { label: "Overview", href: "/docs/architecture/overview" },
      { label: "Invariants", href: "/docs/architecture/invariants" },
      { label: "Customization Tiers", href: "/docs/architecture/customization" },
      { label: "Future Scope", href: "/docs/architecture/future-scope" },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      { label: "Common Errors", href: "/docs/troubleshooting/common-errors" },
      { label: "Selector Failures", href: "/docs/troubleshooting/selector-failures" },
      { label: "Auth Issues", href: "/docs/troubleshooting/auth-issues" },
      { label: "Data Persistence", href: "/docs/troubleshooting/data-persistence" },
    ],
  },
];

export function flatNav(): NavItem[] {
  return DOC_NAV.flatMap((g) => g.items);
}

export function getPrevNext(href: string): { prev: NavItem | null; next: NavItem | null } {
  const flat = flatNav();
  const idx = flat.findIndex((i) => i.href === href);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
