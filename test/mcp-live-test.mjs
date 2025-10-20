import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./src/node-server.js'],
  cwd: process.cwd()
});

const client = new Client({ name: 'live-test', version: '0.0.1' });
await client.connect(transport);

console.log('\n=== CODE ANALYSIS ===');
const analyze = await client.callTool({ name: 'code_analyze', arguments: { path: './src' } });
console.log(JSON.stringify(analyze.structuredContent, null, 2));

console.log('\n=== MEMORY SUGGEST (analyzing README) ===');
const readme = `
Decision: Use Node.js + MCP SDK for stdio transport until Elide beta fixes land
API: MCP server exposes memory_suggest, memory_update, memory_search, code_analyze tools
Config: ELIDE_MCP_MODE=augment disables embeddings to avoid duplicating Augment Context Engine
Rule: All tool handlers must return structuredContent matching outputSchema
Note: Elide HTTP serving is broken in beta10, awaiting upstream fix
`;
const suggest = await client.callTool({ name: 'memory_suggest', arguments: { text: readme } });
console.log(JSON.stringify(suggest.structuredContent, null, 2));

console.log('\n=== MEMORY UPDATE ===');
const update = await client.callTool({ 
  name: 'memory_update', 
  arguments: { 
    entries: suggest.structuredContent.entries.slice(0, 3),
    file: '.mcp/memory/elide-mcp-project.mdc'
  } 
});
console.log(update.content[0].text);

console.log('\n=== MEMORY SEARCH ===');
const search = await client.callTool({ name: 'memory_search', arguments: { query: 'Elide' } });
console.log('Found', search.structuredContent.results.length, 'matches');
if (search.structuredContent.results.length > 0) {
  console.log('First match:', search.structuredContent.results[0].file);
}

process.exit(0);
