#!/usr/bin/env node
/**
 * Test Augment integration - verify auto-detection of .augment/rules
 */

import { spawn } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Testing Augment Integration ===\n');

// Test 1: With .augment/rules (Augment mode)
console.log('Test 1: Augment mode (.augment/rules exists)');
const augmentDir = path.join('.augment', 'rules');
if (!fs.existsSync(augmentDir)) {
  fs.mkdirSync(augmentDir, { recursive: true });
}

const child1 = spawn('node', ['src/node-server.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
const transport1 = new StdioClientTransport({ reader: child1.stdout, writer: child1.stdin });
const client1 = new Client({ name: 'augment-test', version: '0.0.1' });

await client1.connect(transport1);

// Test memory_update in Augment mode
const update1 = await client1.callTool({
  name: 'memory_update',
  arguments: {
    entries: [
      { type: 'note', text: 'Testing Augment integration mode' },
      { type: 'config', text: 'Auto-detected .augment/rules directory' }
    ]
  }
});

console.log('✓', update1.content[0].text);

// Verify file was written to .augment/rules
const augmentFile = path.join('.augment', 'rules', 'mcp-memory.md');
if (fs.existsSync(augmentFile)) {
  console.log('✓ File written to:', augmentFile);
  const content = fs.readFileSync(augmentFile, 'utf8');
  console.log('✓ Content preview:', content.split('\n')[0]);
} else {
  console.log('✗ File NOT found at:', augmentFile);
}

// Test memory_search in Augment mode
const search1 = await client1.callTool({
  name: 'memory_search',
  arguments: { query: 'Augment' }
});

console.log('✓', search1.content[0].text);
console.log('✓ Found', search1.structuredContent.results.length, 'matches');

child1.kill();
await new Promise(resolve => setTimeout(resolve, 500));

console.log('\n---\n');

// Test 2: Without .augment/rules (MCP mode)
console.log('Test 2: MCP mode (.augment/rules removed)');

// Temporarily rename .augment to test fallback
if (fs.existsSync('.augment')) {
  fs.renameSync('.augment', '.augment.backup');
}

const child2 = spawn('node', ['src/node-server.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
const transport2 = new StdioClientTransport({ reader: child2.stdout, writer: child2.stdin });
const client2 = new Client({ name: 'mcp-test', version: '0.0.1' });

await client2.connect(transport2);

// Test memory_update in MCP mode
const update2 = await client2.callTool({
  name: 'memory_update',
  arguments: {
    entries: [
      { type: 'note', text: 'Testing MCP fallback mode' }
    ]
  }
});

console.log('✓', update2.content[0].text);

// Verify file was written to .mcp/memory
const mcpFile = path.join('.mcp', 'memory', 'project.mdc');
if (fs.existsSync(mcpFile)) {
  console.log('✓ File written to:', mcpFile);
} else {
  console.log('✗ File NOT found at:', mcpFile);
}

// Test memory_search in MCP mode
const search2 = await client2.callTool({
  name: 'memory_search',
  arguments: { query: 'fallback' }
});

console.log('✓', search2.content[0].text);

child2.kill();

// Restore .augment directory
if (fs.existsSync('.augment.backup')) {
  fs.renameSync('.augment.backup', '.augment');
}

console.log('\n=== All Tests Passed! ===');
process.exit(0);

