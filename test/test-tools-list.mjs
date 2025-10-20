import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./src/node-server.js'],
  cwd: process.cwd()
});

const client = new Client({ name: 'test', version: '1.0.0' });
await client.connect(transport);

console.log('Connected to server');

const tools = await client.listTools();
console.log('\nTools returned by server:');
console.log(JSON.stringify(tools, null, 2));

process.exit(0);
