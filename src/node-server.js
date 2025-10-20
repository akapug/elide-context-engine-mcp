import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import fs from 'node:fs';
import path from 'node:path';

const mode = process.env.ELIDE_MCP_MODE || 'augment';
const embeddingsEnabled = mode === 'universal' || (mode === 'custom' && process.env.ELIDE_MCP_EMBEDDINGS === 'on');

const server = new Server({ name: 'elide-context-engine-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });

server.tool('memory_suggest', 'Suggest project memories', { inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }, async (args) => {
  const text = args.text || '';
  const lines = String(text).split(/\n+/).map(s => s.trim()).filter(Boolean);
  const entries = [];
  for (const l of lines) {
    if (/(decision|rule|note|todo|guideline)/i.test(l)) entries.push({ type: 'note', text: l, tags: ['auto'] });
    if (/(API|endpoint|config|path)/i.test(l)) entries.push({ type: 'config', text: l, tags: ['auto'] });
  }
  const seen = new Set();
  const dedup = [];
  for (const e of entries) { if (!seen.has(e.text)) { seen.add(e.text); dedup.push(e); } }
  return { content: [{ type: 'text', text: JSON.stringify(dedup) }], structuredContent: { entries: dedup } };
});

server.tool('memory_update', 'Apply memory updates', { inputSchema: { type: 'object', properties: { entries: { type: 'array' }, file: { type: 'string' } }, required: ['entries'] } }, async (args) => {
  const file = args.file || path.join('.mcp', 'memory', 'project.mdc');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const entries = args.entries || [];
  const lines = entries.map(e => '- [' + e.type + '] ' + e.text);
  fs.appendFileSync(file, lines.join('\n') + '\n');
  return { content: [{ type: 'text', text: 'Wrote ' + lines.length + ' entries to ' + file }] };
});

server.tool('memory_search', 'Search memories', { inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }, async (args) => {
  const query = String(args.query || '').toLowerCase();
  const results = [];
  const root = path.join('.mcp', 'memory');
  if (fs.existsSync(root)) {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir)) {
        const p = path.join(dir, e);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p); else if (p.endsWith('.mdc')) {
          const text = fs.readFileSync(p, 'utf8');
          if (text.toLowerCase().includes(query)) results.push({ file: p, excerpt: text.slice(0, 200) });
        }
      }
    };
    walk(root);
  }
  return { content: [{ type: 'text', text: JSON.stringify(results) }], structuredContent: { results } };
});

server.tool('code_analyze', 'Analyze code basics', { inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }, async (args) => {
  const target = args.path;
  const exts = ['.ts','.tsx','.js','.jsx','.py','.kt','.java','.rb','.go','.rs','.c','.cpp'];
  let files = 0, bytes = 0;
  const st = fs.statSync(target);
  if (st.isDirectory()) {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir)) {
        const p = path.join(dir, e);
        const s = fs.statSync(p);
        if (s.isDirectory()) walk(p); else if (exts.some(x => p.endsWith(x))) { files++; bytes += s.size; }
      }
    };
    walk(target);
  } else { files = 1; bytes = st.size; }
  return { content: [{ type: 'text', text: 'files=' + files + ', bytes=' + bytes }], structuredContent: { files: files, bytes: bytes } };
});

if (embeddingsEnabled) {
  server.tool('semantic_search', 'Semantic search (stub)', { inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }, async (_args) => ({ content: [{ type: 'text', text: 'TODO: semantic search (Phase 2)'}] }));
}

const transport = new StdioServerTransport();
await server.start(transport);
