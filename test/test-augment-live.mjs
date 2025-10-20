#!/usr/bin/env node
/**
 * Live test of Augment integration
 * This spawns the MCP server and tests that it writes to .augment/rules
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Testing Augment Integration (Live) ===\n');

// Ensure we're in the parent directory where .augment/rules exists
process.chdir('..');
console.log('Working directory:', process.cwd());
console.log('.augment/rules exists:', fs.existsSync('.augment/rules'));

const augmentFile = path.join('.augment', 'rules', 'mcp-memory.md');

// Clean up any existing test file
if (fs.existsSync(augmentFile)) {
  console.log('Removing existing', augmentFile);
  fs.unlinkSync(augmentFile);
}

console.log('\nStarting MCP server from:', path.join('elide-context-engine-mcp', 'src', 'node-server.js'));

const transport = new StdioClientTransport({
  command: 'node',
  args: [path.join('elide-context-engine-mcp', 'src', 'node-server.js')]
});

const client = new Client({ name: 'augment-live-test', version: '0.0.1' });

try {
  await client.connect(transport);
  console.log('✓ Connected to MCP server\n');

  // Test 1: memory_update should write to .augment/rules/mcp-memory.md
  console.log('Test 1: Writing memory with memory_update');
  const update = await client.callTool({
    name: 'memory_update',
    arguments: {
      entries: [
        { type: 'note', text: 'Testing Augment integration - this should go to .augment/rules/mcp-memory.md' },
        { type: 'config', text: 'MCP server auto-detected Augment workspace' },
        { type: 'note', text: 'Timestamp: ' + new Date().toISOString() }
      ]
    }
  });

  console.log('Response:', update.content[0].text);

  // Verify file was created
  await new Promise(resolve => setTimeout(resolve, 100)); // Give it a moment

  if (fs.existsSync(augmentFile)) {
    console.log('✅ SUCCESS: File created at', augmentFile);
    const content = fs.readFileSync(augmentFile, 'utf8');
    console.log('\nFile contents:');
    console.log('---');
    console.log(content);
    console.log('---\n');
  } else {
    console.log('❌ FAILED: File NOT created at', augmentFile);
    console.log('Checking what files exist in .augment/rules:');
    const files = fs.readdirSync('.augment/rules');
    console.log(files);
  }

  // Test 2: memory_search should find the entry
  console.log('\nTest 2: Searching for the entry');
  const search = await client.callTool({
    name: 'memory_search',
    arguments: { query: 'Augment integration' }
  });

  console.log('Response:', search.content[0].text);
  console.log('Found', search.structuredContent.results.length, 'matches');

  if (search.structuredContent.results.length > 0) {
    console.log('✅ SUCCESS: Found entries in Augment mode');
    console.log('First match:', search.structuredContent.results[0].file);
  } else {
    console.log('❌ FAILED: No matches found');
  }

  await client.close();
  console.log('\n=== All Tests Complete ===');
  process.exit(0);

} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

