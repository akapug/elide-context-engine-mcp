import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({ name: 'test', version: '1.0.0' });

// Check if there's a setRequestHandler method
console.log('McpServer methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(server)).filter(m => !m.startsWith('_')));

// Check the registerTool signature
console.log('\nregisterTool:', typeof server.registerTool);
