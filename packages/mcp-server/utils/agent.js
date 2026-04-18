import fs from 'fs';
import path from 'path';

/**
 * Read a subagent's system prompt from the project's .claude/agents/ directory.
 * Strips YAML frontmatter so only the pure prompt body is returned.
 *
 * @param {string} projectRoot
 * @param {string} agent - agent name without `.md` (e.g. 'playwright-test-planner')
 * @returns {{ found: boolean, path?: string, prompt?: string }}
 */
export function readAgentPrompt(projectRoot, agent) {
  const candidates = [
    path.join(projectRoot, '.claude/agents', `${agent}.md`),
    path.join(projectRoot, '.claude/agents/playwright', `${agent}.md`),
  ];
  const agentPath = candidates.find((p) => fs.existsSync(p));
  if (!agentPath) return { found: false };

  const raw = fs.readFileSync(agentPath, 'utf-8');
  // Strip YAML frontmatter (--- ... ---\n)
  const prompt = raw.replace(/^---[\s\S]*?---\n/, '').trim();
  return { found: true, path: agentPath, prompt };
}

/** Read project's .mcp.json and return server names (for diagnostics). */
export function listProjectMcpServers(projectRoot) {
  const mcpPath = path.join(projectRoot, '.mcp.json');
  if (!fs.existsSync(mcpPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    return Object.keys(parsed.mcpServers ?? {});
  } catch {
    return [];
  }
}
