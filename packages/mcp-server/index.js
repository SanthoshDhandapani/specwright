#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import tool definitions and handlers
import { definition as configureDef, handler as configureHandler } from './tools/configure.js';
import { definition as exploreDef, handler as exploreHandler } from './tools/explore.js';
import { definition as planDef, handler as planHandler } from './tools/plan.js';
import { definition as statusDef, handler as statusHandler } from './tools/status.js';
import { definition as automateDef, handler as automateHandler } from './tools/automate.js';

const tools = [
  { definition: automateDef, handler: automateHandler },
  { definition: configureDef, handler: configureHandler },
  { definition: exploreDef, handler: exploreHandler },
  { definition: planDef, handler: planHandler },
  { definition: statusDef, handler: statusHandler },
];

const server = new Server({ name: 'e2e-automation', version: '1.0.0' }, { capabilities: { tools: {} } });

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => t.definition),
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find((t) => t.definition.name === name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    return await tool.handler(args || {});
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error in ${name}: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
