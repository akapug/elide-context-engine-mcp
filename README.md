# Elide Context Engine MCP Server

An MCP server that augments AI coding assistants with project memory management, code analysis, and optional local embeddings/RAG.

- Pure Elide runtime (stdio transport)
- Augment-aware defaults (no duplicate embeddings vs Context Engine)
- Optional HTTP transport via Node.js shim (clearly labeled)

## Quick start (local, stdio)

Run with Elide:

```
elide ./src/server.js
```

Then configure your MCP client (Augment, Claude Desktop, etc.) to run the above command as a stdio MCP server.

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

## HTTP transport (Node.js shim)

Temporary shim (until Elide HTTP intrinsics are fixed):

```
node ./shim/http-bridge.js
```

It spawns the Elide stdio server and exposes HTTP JSON-RPC on localhost.

