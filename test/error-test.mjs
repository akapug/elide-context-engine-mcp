import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./src/node-server.js'],
  cwd: process.cwd()
});

const client = new Client({ name: 'error-test', version: '0.0.1' });
await client.connect(transport);

const result = await client.callTool({ name: 'code_analyze', arguments: { path: '/nonexistent/path' } });
console.log('Error handling result:', result.content[0].text);
process.exit(0);
