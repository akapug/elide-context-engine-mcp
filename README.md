# Elide Context Engine MCP Server

An MCP server that augments AI coding assistants with project memory management, code analysis, and optional local embeddings/RAG.

- Pure Elide runtime (stdio transport)
- Augment-aware defaults (no duplicate embeddings vs Context Engine)
- Optional HTTP transport via Node.js shim (clearly labeled)

## Quick start (local, stdio)

Recommended (Node.js, working today):

```
npm install
npm run start:node
```

This starts an MCP stdio server using @modelcontextprotocol/sdk.

Elide-native stdio server is currently blocked in 1.0.0-beta10 due to upstream stdio/HTTP intrinsics. We’ll switch the default back to pure Elide when fixed.

## Tools (MVP)

- memory_suggest: suggest structured .mdc-style memory updates
- memory_update: write approved suggestions to memory files
- memory_search: keyword search memories (semantic optional)
- code_analyze: basic AST/complexity/deps analysis

## Modes & feature flags

- mode=augment (default): embeddings disabled to avoid duplication
- mode=universal: all features enabled
- mode=custom: governed by flags

Environment variables:
- ELIDE_MCP_MODE: augment|universal|custom (default: augment)
- ELIDE_MCP_MEM_DIR: path to memory dir (default: ./.mcp/memory)
- ELIDE_MCP_EMBEDDINGS: on|off|auto (default: auto)

## Augment MCP configuration

Example to add in Augment Agent’s MCP settings (stdio):

<augment_code_snippet mode="EXCERPT">
````json
{
  "name": "elide-context-engine-mcp",
  "type": "stdio",
  "command": "node",
  "args": ["./src/node-server.js"],
  "cwd": "/home/pug/code/elide-context-engine-mcp",
  "env": {
    "ELIDE_MCP_MODE": "augment",
    "ELIDE_MCP_EMBEDDINGS": "auto"
  }
}
````
</augment_code_snippet>

- In Augment mode, local embeddings are off by default to avoid duplicating Augment’s Context Engine.
- Switch to `universal` mode to enable the `semantic_search` stub.

## HTTP transport (future)

Once Elide’s HTTP intrinsics are fixed, we’ll add a lightweight HTTP bridge. For now, prefer stdio.
