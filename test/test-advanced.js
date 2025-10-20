import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Test advanced analysis tools (Phase 7)
 */
async function test() {
  console.log('🧪 Testing Phase 7: Advanced Code Analysis\n');

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./src/node-server.js'],
    cwd: process.cwd()
  });

  const client = new Client({
    name: 'test-advanced',
    version: '1.0.0'
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: List tools (should now have 7 tools)
    console.log('Test 1: List all tools');
    const toolsResult = await client.listTools();
    const tools = toolsResult.tools || [];
    console.log(`✓ Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}\n`);

    // Test 2: AST Analysis
    console.log('Test 2: AST Analysis');
    const astResult = await client.callTool({
      name: 'ast_analyze',
      arguments: { path: './src/node-server.js' }
    });
    console.log('✓ AST Analysis:');
    console.log(astResult.content[0].text);
    console.log('\nStructured data:');
    console.log(`  Functions: ${astResult.structuredContent.functions.length}`);
    console.log(`  Classes: ${astResult.structuredContent.classes.length}`);
    console.log(`  Imports: ${astResult.structuredContent.imports.length}`);
    console.log(`  Exports: ${astResult.structuredContent.exports.length}`);
    if (astResult.structuredContent.functions.length > 0) {
      console.log('\n  Sample function:', astResult.structuredContent.functions[0]);
    }
    console.log('');

    // Test 3: Complexity Analysis
    console.log('Test 3: Complexity Analysis');
    const complexityResult = await client.callTool({
      name: 'complexity_analyze',
      arguments: { path: './src/node-server.js' }
    });
    console.log('✓ Complexity Analysis:');
    console.log(complexityResult.content[0].text);
    console.log('\nStructured data:');
    console.log(`  Cyclomatic Complexity: ${complexityResult.structuredContent.aggregate.cyclomatic}`);
    console.log(`  Maintainability: ${complexityResult.structuredContent.maintainability.toFixed(2)}`);
    console.log(`  Methods analyzed: ${complexityResult.structuredContent.methods.length}`);
    if (complexityResult.structuredContent.methods.length > 0) {
      const highComplexity = complexityResult.structuredContent.methods.filter(m => m.cyclomatic > 5);
      console.log(`  High complexity methods (>5): ${highComplexity.length}`);
      if (highComplexity.length > 0) {
        console.log('\n  Most complex method:', highComplexity[0]);
      }
    }
    console.log('');

    // Test 4: Dependency Analysis
    console.log('Test 4: Dependency Analysis');
    const depResult = await client.callTool({
      name: 'dependency_analyze',
      arguments: { path: './src' }
    });
    console.log('✓ Dependency Analysis:');
    console.log(depResult.content[0].text);
    console.log('\nStructured data:');
    console.log(`  Total files: ${depResult.structuredContent.totalFiles}`);
    console.log(`  Total dependencies: ${depResult.structuredContent.totalDependencies}`);
    if (depResult.structuredContent.edges.length > 0) {
      console.log('\n  Sample dependency:', depResult.structuredContent.edges[0]);
    }
    console.log('');

    console.log('✅ All Phase 7 tests passed!');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.close();
  }
}

test();

