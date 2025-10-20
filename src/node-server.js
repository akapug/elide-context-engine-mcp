import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeAST, analyzeComplexity, analyzeDependencies, getASTSummary, getComplexitySummary, getDependencySummary } from './advanced-analysis.js';

const mode = process.env.ELIDE_MCP_MODE || 'augment';
const embeddingsEnabled = mode === 'universal' || (mode === 'custom' && process.env.ELIDE_MCP_EMBEDDINGS === 'on');

const server = new McpServer({ name: 'elide-context-engine-mcp', version: '0.1.0' });

/**
 * Get the appropriate memory directory based on environment
 * - If ../.augment/rules exists (Augment workspace): use it (Augment-optimized mode)
 * - Otherwise: use .mcp/memory (universal mode)
 *
 * Note: MCP server runs in /code/elide-context-engine-mcp but Augment workspace is /code/
 */
function getMemoryDir() {
  const augmentDir = path.join('..', '.augment', 'rules');
  if (fs.existsSync(augmentDir)) {
    return augmentDir;
  }
  return path.join('.mcp', 'memory');
}

/**
 * Get the default memory file name based on environment
 */
function getDefaultMemoryFile() {
  const memDir = getMemoryDir();
  const isAugment = memDir.includes('.augment');
  return path.join(memDir, isAugment ? 'mcp-memory.md' : 'project.mdc');
}

server.registerTool(
  'memory_suggest',
  { title: 'Suggest project memories', description: 'Analyze text to propose .mdc entries', inputSchema: { text: z.string() }, outputSchema: { entries: z.array(z.any()) } },
  async ({ text }) => {
    const lines = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    const entries = [];
    for (const l of lines) {
      if (/(decision|rule|note|todo|guideline)/i.test(l)) entries.push({ type: 'note', text: l, tags: ['auto'] });
      if (/(API|endpoint|config|path)/i.test(l)) entries.push({ type: 'config', text: l, tags: ['auto'] });
    }
    const seen = new Set();
    const dedup = [];
    for (const e of entries) { if (!seen.has(e.text)) { seen.add(e.text); dedup.push(e); } }
    return { content: [{ type: 'text', text: JSON.stringify(dedup) }], structuredContent: { entries: dedup } };
  }
);

server.registerTool(
  'memory_update',
  { title: 'Apply memory updates', description: 'Write memory entries', inputSchema: { entries: z.array(z.any()), file: z.string().optional() }, outputSchema: { ok: z.boolean().optional() } },
  async ({ entries, file }) => {
    const f = file || getDefaultMemoryFile();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const lines = (entries || []).map(e => '- [' + e.type + '] ' + e.text);
    fs.appendFileSync(f, lines.join('\n') + '\n');
    const output = { ok: true };
    const memDir = getMemoryDir();
    const mode = memDir.includes('.augment') ? 'Augment' : 'MCP';
    return { content: [{ type: 'text', text: `Wrote ${lines.length} entries to ${f} (${mode} mode)` }], structuredContent: output };
  }
);

server.registerTool(
  'memory_search',
  { title: 'Search memories', description: 'Keyword search across memory files', inputSchema: { query: z.string() }, outputSchema: { results: z.array(z.object({ file: z.string(), excerpt: z.string().optional() })) } },
  async ({ query }) => {
    const q = String(query || '').toLowerCase();
    const results = [];
    const root = getMemoryDir();
    if (fs.existsSync(root)) {
      const walk = (dir) => {
        try {
          for (const e of fs.readdirSync(dir)) {
            const p = path.join(dir, e);
            try {
              const st = fs.statSync(p);
              if (st.isDirectory()) walk(p); else if (p.endsWith('.mdc') || p.endsWith('.md')) {
                const text = fs.readFileSync(p, 'utf8');
                if (text.toLowerCase().includes(q)) results.push({ file: p, excerpt: text.slice(0, 200) });
              }
            } catch (err) { /* skip inaccessible files */ }
          }
        } catch (err) { /* skip inaccessible dirs */ }
      };
      walk(root);
    }
    const memDir = getMemoryDir();
    const mode = memDir.includes('.augment') ? 'Augment' : 'MCP';
    return { content: [{ type: 'text', text: `Found ${results.length} matches in ${mode} mode` }], structuredContent: { results } };
  }
);

server.registerTool(
  'code_analyze',
  { title: 'Analyze code basics', description: 'Count files/bytes', inputSchema: { path: z.string() }, outputSchema: { files: z.number(), bytes: z.number() } },
  async ({ path: target }) => {
    const exts = ['.ts','.tsx','.js','.jsx','.py','.kt','.java','.rb','.go','.rs','.c','.cpp'];
    let files = 0, bytes = 0;
    try {
      const st = fs.statSync(target);
      if (st.isDirectory()) {
        const walk = (dir) => {
          try {
            for (const e of fs.readdirSync(dir)) {
              const p = path.join(dir, e);
              try {
                const s = fs.statSync(p);
                if (s.isDirectory()) walk(p); else if (exts.some(x => p.endsWith(x))) { files++; bytes += s.size; }
              } catch (err) { /* skip inaccessible files */ }
            }
          } catch (err) { /* skip inaccessible dirs */ }
        };
        walk(target);
      } else { files = 1; bytes = st.size; }
    } catch (err) {
      return { content: [{ type: 'text', text: 'Error: ' + err.message }], structuredContent: { files: 0, bytes: 0 } };
    }
    return { content: [{ type: 'text', text: 'files=' + files + ', bytes=' + bytes }], structuredContent: { files, bytes } };
  }
);

// Phase 7: Advanced code analysis
server.registerTool(
  'ast_analyze',
  {
    title: 'AST Analysis',
    description: 'Parse JavaScript/TypeScript and extract AST information (functions, classes, imports, exports)',
    inputSchema: { path: z.string() }
  },
  async ({ path: filePath }) => {
    const result = analyzeAST(filePath);
    const summary = getASTSummary(result);
    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: result
    };
  }
);

server.registerTool(
  'complexity_analyze',
  {
    title: 'Complexity Analysis',
    description: 'Calculate cyclomatic complexity and maintainability metrics',
    inputSchema: { path: z.string() }
  },
  async ({ path: filePath }) => {
    const result = analyzeComplexity(filePath);
    const summary = getComplexitySummary(result);
    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: result
    };
  }
);

server.registerTool(
  'dependency_analyze',
  {
    title: 'Dependency Analysis',
    description: 'Map import/export relationships and build dependency graph',
    inputSchema: { path: z.string() }
  },
  async ({ path: dirPath }) => {
    const result = analyzeDependencies(dirPath);
    const summary = getDependencySummary(result);
    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: result
    };
  }
);

if (embeddingsEnabled) {
  server.registerTool(
    'semantic_search',
    { title: 'Semantic search (stub)', description: 'Local embeddings', inputSchema: { query: z.string() }, outputSchema: {} },
    async ({ query }) => ({ content: [{ type: 'text', text: 'TODO: semantic search: ' + query }] })
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
