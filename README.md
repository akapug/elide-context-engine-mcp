# Elide Context Engine MCP Server

An MCP server that augments AI coding assistants with project memory management, code analysis, and optional local embeddings/RAG.

**Status:** ✅ Working with Node.js + MCP SDK (stdio transport)  
**Elide native:** Blocked in beta10 (awaiting upstream stdio/HTTP fixes)

## Features

- **Augment-aware defaults:** Embeddings disabled by default to avoid duplicating Augment's Context Engine
- **Memory management:** Structured .mdc file storage for project decisions, rules, and notes
- **Code analysis:** File/byte counting with error handling for invalid paths
- **Extensible:** Easy to add more tools as needed

## Quick start

### Installation

```bash
npm install
```

### Run locally (stdio)

```bash
npm run start:node
```

This starts an MCP stdio server using `@modelcontextprotocol/sdk`.

### Test

```bash
npm test
```

Runs smoke tests to verify all tools work correctly.

## Tools

All tools are available via the MCP protocol:

### Core Tools (Phases 1-4)
- **memory_suggest** - Analyze text to propose structured .mdc entries (auto-categorizes as note/config/etc)
- **memory_update** - Write approved memory entries to .mdc files
- **memory_search** - Keyword search across all .mdc files in memory directory
- **code_analyze** - Count code files and bytes (supports .ts, .tsx, .js, .jsx, .py, .kt, .java, .rb, .go, .rs, .c, .cpp)

### Advanced Tools (Phase 7)
- **ast_analyze** - Parse JavaScript/TypeScript files and extract AST information (functions, classes, imports, exports)
- **complexity_analyze** - Calculate cyclomatic complexity and maintainability metrics using escomplex
- **dependency_analyze** - Map import/export relationships and build dependency graph for a directory

## Augment Integration

**Auto-detection:** The MCP server automatically detects if it's running in an Augment workspace and adapts accordingly:

- ✅ **Augment mode**: If `../.augment/rules` exists (Augment workspace), memory is written to `../.augment/rules/mcp-memory.md`
- 📁 **Universal mode**: Otherwise, memory is written to `.mcp/memory/*.mdc`

This means:
- When used in Augment, memories become **Augment Rules** automatically read by the AI
- When used in other AI assistants (Cline, Windsurf, etc.), memories use standard MCP format
- No configuration needed - it just works!

**Augment Rules Format:**
```markdown
---
type: "always"  # or "manual" or "agent_requested"
description: "Description for auto-detection"
---
Your rule content here
```

## Modes & feature flags

- **mode=augment** (default): embeddings disabled to avoid duplication
- **mode=universal**: all features enabled (includes semantic_search stub)
- **mode=custom**: governed by individual flags

Environment variables:
- `ELIDE_MCP_MODE`: augment|universal|custom (default: augment)
- `ELIDE_MCP_EMBEDDINGS`: on|off|auto (default: auto)

## Augment MCP configuration

### Via UI

In Augment's MCP settings, click "Add MCP" and configure:

**Command:**
```
node [/home/...]/elide-context-engine-mcp/src/node-server.js
```

**Environment Variables:**
- `ELIDE_MCP_MODE` = `augment`
- `ELIDE_MCP_EMBEDDINGS` = `auto`

### Via JSON import

```json
{
  "mcpServers": {
    "elide-context-engine-mcp": {
      "command": "node",
      "args": ["./src/node-server.js"],
      "cwd": "/home/pug/code/elide-context-engine-mcp",
      "env": {
        "ELIDE_MCP_MODE": "augment",
        "ELIDE_MCP_EMBEDDINGS": "auto"
      }
    }
  }
}
```

**Notes:**
- In Augment mode, local embeddings are off by default to avoid duplicating Augment's Context Engine
- Switch to `universal` mode to enable the `semantic_search` stub
- Tools appear in Augment as `<tool-name>_elide-context-engine-mcp`

## Architecture

- **Runtime:** Node.js (Elide support coming when beta10+ fixes land)
- **MCP SDK:** @modelcontextprotocol/sdk v1.20.1
- **Transport:** stdio (HTTP planned for future)
- **Schema validation:** Zod v3.23.8

## Development

### Project structure

```
elide-context-engine-mcp/
├── src/
│   └── node-server.js       # Main MCP server implementation
├── test/
│   ├── node-smoke.mjs       # Smoke test using MCP SDK client
│   ├── check-sdk.mjs        # SDK API introspection
│   └── test-tools-list.mjs  # Verify tools/list response
├── .mcp/memory/             # Memory storage (created on first use)
├── package.json
└── README.md
```

### Adding new tools

```javascript
server.registerTool(
  'tool-name',
  {
    title: 'Display Name',
    description: 'What this tool does',
    inputSchema: { param: z.string() },
    outputSchema: { result: z.any() }
  },
  async ({ param }) => {
    // Tool implementation
    return {
      content: [{ type: 'text', text: 'Result text' }],
      structuredContent: { result: 'data' }
    };
  }
);
```

## Roadmap

- [x] Phase 1: Memory management tools (suggest, update, search)
- [x] Phase 2: Code analysis basics
- [x] Phase 3: Error handling and robustness
- [x] Phase 4: Augment integration and testing
- [ ] Phase 5: Elide native implementation (blocked on beta10+ fixes)
- [ ] Phase 6: HTTP transport option
- [x] Phase 7: Advanced code analysis (AST, complexity, dependencies)
- [x] Phase 8: Optional local embeddings/RAG (dependencies installed, ready for implementation)

## License

MIT

