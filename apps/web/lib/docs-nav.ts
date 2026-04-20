export type NavItem = { label: string; href: string };
export type NavGroup = { title: string; items: NavItem[] };

export const DOC_NAV: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs/getting-started/introduction" },
      { label: "Installation", href: "/docs/getting-started/installation" },
      { label: "Quick Start", href: "/docs/getting-started/quick-start" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { label: "10-Phase Pipeline", href: "/docs/core-concepts/pipeline" },
      { label: "Agents & Skills", href: "/docs/core-concepts/agents-and-skills" },
      { label: "BDD Test Format", href: "/docs/core-concepts/bdd-format" },
      { label: "Agent Memory", href: "/docs/core-concepts/agent-memory" },
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
      { label: "Auth Strategies", href: "/docs/configuration/auth-strategies" },
      { label: "Field Types", href: "/docs/configuration/field-types" },
    ],
  },
  {
    title: "Examples",
    items: [
      { label: "Show-Buff Demo", href: "/docs/examples/show-buff" },
      { label: "Workflow Tests", href: "/docs/examples/workflow-tests" },
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
