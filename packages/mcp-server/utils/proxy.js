import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Create a proxy to a stdio-based MCP server (spawns child process).
 * Returns { tools, call, close } or null if connection fails.
 */
export async function createStdioProxy({ command, args = [], env = {}, label }) {
  try {
    const transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env },
    });
    const client = new Client(
      { name: `specwright-${label}-proxy`, version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(transport);
    const { tools } = await client.listTools();
    return {
      tools,
      call: (name, callArgs) => client.callTool({ name, arguments: callArgs ?? {} }),
      close: () => transport.close(),
    };
  } catch (err) {
    process.stderr.write(`[specwright-mcp] ${label} proxy failed to start: ${err.message}\n`);
    return null;
  }
}

/**
 * Create a proxy to a streamable-HTTP MCP server.
 * Returns { tools, call, close } or null if connection fails.
 */
export async function createHttpProxy({ url, headers = {}, label }) {
  try {
    const { StreamableHTTPClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/streamableHttp.js'
    );
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers },
    });
    const client = new Client(
      { name: `specwright-${label}-proxy`, version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(transport);
    const { tools } = await client.listTools();
    return {
      tools,
      call: (name, callArgs) => client.callTool({ name, arguments: callArgs ?? {} }),
      close: () => transport.close(),
    };
  } catch (err) {
    process.stderr.write(`[specwright-mcp] ${label} HTTP proxy failed: ${err.message}\n`);
    return null;
  }
}
