import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';

// ── Path security ───────────────────────────────────────────────────────────
// All paths are resolved relative to the configured project root.
// Traversal outside the project root is rejected.

function resolveAndValidate(filePath) {
  const config = getConfig();
  if (!config.projectConfigured) {
    throw new Error('Project not configured. Call e2e_configure with action: "set_project" first.');
  }
  const root = config.projectRoot;
  const resolved = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(root, filePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Access denied: "${filePath}" is outside the project root (${root})`);
  }
  return resolved;
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const definitions = [
  {
    name: 'read_file',
    annotations: { title: 'Read File' },
    description: 'Read the complete contents of a file. Use this to read MEMORY.md, .env.testing, seed.spec.js, plan files, or any other project file. Path may be absolute or relative to the project root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path (absolute or relative to project root)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    annotations: { title: 'Write File' },
    description: 'Create or overwrite a file with the given content. Creates parent directories as needed. Use this to write seed files, plan files, memory files, .feature files, and steps.js files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path (absolute or relative to project root)' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    annotations: { title: 'Edit File' },
    description: 'Replace a specific string in an existing file. Fails if old_str is not found or appears more than once. Returns a diff of the change.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path (absolute or relative to project root)' },
        old_str: { type: 'string', description: 'Exact text to find and replace (must appear exactly once)' },
        new_str: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_str', 'new_str'],
    },
  },
  {
    name: 'list_directory',
    annotations: { title: 'List Directory' },
    description: 'List the contents of a directory, showing files and subdirectories. Useful for checking what files exist in e2e-tests/plans/, e2e-tests/features/playwright-bdd/, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path (absolute or relative to project root). Defaults to project root if omitted.' },
      },
    },
  },
];

// ── Handlers ────────────────────────────────────────────────────────────────

export const handlers = {
  read_file({ path: filePath }) {
    const resolved = resolveAndValidate(filePath);
    if (!fs.existsSync(resolved)) {
      return { content: [{ type: 'text', text: `File not found: ${resolved}` }], isError: true };
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return { content: [{ type: 'text', text: `Path is a directory, not a file: ${resolved}` }], isError: true };
    }
    const content = fs.readFileSync(resolved, 'utf-8');
    return { content: [{ type: 'text', text: content }] };
  },

  write_file({ path: filePath, content }) {
    const resolved = resolveAndValidate(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf-8');
    return { content: [{ type: 'text', text: `✅ Written: ${resolved} (${content.length} chars)` }] };
  },

  edit_file({ path: filePath, old_str, new_str }) {
    const resolved = resolveAndValidate(filePath);
    if (!fs.existsSync(resolved)) {
      return { content: [{ type: 'text', text: `File not found: ${resolved}` }], isError: true };
    }
    const original = fs.readFileSync(resolved, 'utf-8');
    const count = original.split(old_str).length - 1;
    if (count === 0) {
      return { content: [{ type: 'text', text: `old_str not found in ${resolved}` }], isError: true };
    }
    if (count > 1) {
      return { content: [{ type: 'text', text: `old_str appears ${count} times in ${resolved} — provide more context to make it unique` }], isError: true };
    }
    const updated = original.replace(old_str, new_str);
    fs.writeFileSync(resolved, updated, 'utf-8');

    // Simple unified-diff-style summary
    const oldLines = old_str.split('\n').map((l) => `- ${l}`).join('\n');
    const newLines = new_str.split('\n').map((l) => `+ ${l}`).join('\n');
    return {
      content: [{
        type: 'text',
        text: `✅ Edited: ${resolved}\n\n${oldLines}\n${newLines}`,
      }],
    };
  },

  list_directory({ path: dirPath } = {}) {
    const config = getConfig();
    if (!config.projectConfigured) {
      return { content: [{ type: 'text', text: '⚠️ Project not configured. Call e2e_configure with action: "set_project" first.' }], isError: true };
    }
    const targetPath = dirPath
      ? resolveAndValidate(dirPath)
      : config.projectRoot;

    if (!fs.existsSync(targetPath)) {
      return { content: [{ type: 'text', text: `Directory not found: ${targetPath}` }], isError: true };
    }
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return { content: [{ type: 'text', text: `Path is a file, not a directory: ${targetPath}` }], isError: true };
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const lines = entries
      .sort((a, b) => {
        // Directories first, then files, both alphabetical
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((e) => `${e.isDirectory() ? '[dir]' : '[file]'} ${e.name}`);

    return {
      content: [{
        type: 'text',
        text: `${targetPath}\n\n${lines.join('\n') || '(empty directory)'}`,
      }],
    };
  },
};
