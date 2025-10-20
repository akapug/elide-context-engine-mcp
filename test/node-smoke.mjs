import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./src/node-server.js'],
  cwd: process.cwd()
});

const client = new Client({ name: 'smoke-client', version: '0.0.1' });
await client.connect(transport);

const tools = await client.listTools();
console.log('TOOLS:', tools.tools.map(t => t.name).join(','));

const suggest = await client.callTool({ name: 'memory_suggest', arguments: { text: 'Decision: use stdio\nAPI: /v1/tools' } });
console.log('SUGGEST_COUNT:', (suggest.structuredContent?.entries?.length) ?? 'n/a');

await client.callTool({ name: 'memory_update', arguments: { entries: [{ type: 'note', text: 'Use stdio MCP by default' }], file: '.mcp/memory/test.mdc' } });

const search = await client.callTool({ name: 'memory_search', arguments: { query: 'stdio' } });
console.log('SEARCH_MATCHES:', search.structuredContent?.results?.length ?? 0);

process.exit(0);
