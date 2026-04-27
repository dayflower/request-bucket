# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Request-bucket is a self-hosted webhook inspection tool built with Bun, TypeScript, React, and OpenSearch. It captures HTTP requests for analysis and debugging, similar to RequestBin.

## Key Architecture

- **Runtime**: [Bun](https://bun.com) — runs TypeScript directly, bundles the client, and serves both API and SPA from a single `Bun.serve` process
- **Server**: `server/index.ts` wires `Bun.serve` routes for `/api/*`, `/hook/*`, and SPA fallback
- **Client**: React 19 SPA with React Router 7
- **Common**: Shared TypeScript types between client and server
- **Storage**: Abstracted storage layer supporting OpenSearch and in-memory storage

## Storage Configuration

The application supports multiple storage backends via the `STORAGE_TYPE` environment variable:

### OpenSearch Storage
Set `STORAGE_TYPE=opensearch`. Required variables:
- `OPENSEARCH_ENDPOINT`: OpenSearch cluster endpoint
- `OPENSEARCH_INDEX`: Index name for storing request data
- `OPENSEARCH_USERNAME`: (optional) Authentication username
- `OPENSEARCH_PASSWORD`: (optional) Authentication password

### In-Memory Storage (default)
If `STORAGE_TYPE` is not set, in-memory storage is used by default. Alternatively, set `STORAGE_TYPE=memory`. No additional configuration required.
Note: Only works with single server instances, data is lost on restart.

### Common Environment Variables
- `IGNORE_HEADER_PREFIX`: (optional) Comma-separated header prefixes to filter
- `PORT`: (optional) Server port, defaults to 3000

## Development Commands

```bash
# Development server with hot module reload
bun run dev

# Build the client SPA into dist/public/
bun run build

# Production server (serves dist/public/ as static SPA)
bun run start

# Tests (Bun's built-in runner)
bun test                # Run tests once
bun run test:watch      # Run tests in watch mode
bun run test:coverage   # Run tests with coverage report

# Type check
bun run typecheck

# Check and fix (using Biome)
bun run check           # Check for issues
bun run fix             # Check and auto-fix issues

# Clean build artifacts
bun run clean
```

## Build Process

- **Dev**: `bun --hot server/index.ts` runs the server and bundles `client/index.html` on the fly with HMR. No separate dev server.
- **Prod build**: `bun build ./client/index.html --outdir=dist/public` produces the static SPA bundle.
- **Prod run**: `NODE_ENV=production bun server/index.ts` serves API routes plus `dist/public/` with SPA fallback.

`scripts/with-env.ts` injects `BUN_PUBLIC_APP_VERSION` and `BUN_PUBLIC_GIT_COMMIT` into the environment so the frontend can reference them via `process.env` at bundle time. `bunfig.toml` enables `BUN_PUBLIC_*` exposure.

## Key File Structure

- `server/index.ts`: `Bun.serve` entry — binds storage, registers routes, handles graceful shutdown
- `server/routes/hook.ts`: `/hook/*` webhook capture handler
- `server/routes/api.ts`: `/api/bucket/:bucket/record/...` read API handlers
- `server/static.ts`: Production static file handler with SPA fallback to `dist/public/index.html`
- `server/storage/`: Storage abstraction layer
  - `interface.ts`: Storage adapter interface
  - `factory.ts`: Storage factory reading `STORAGE_TYPE` and friends
  - `opensearch.ts`: OpenSearch storage implementation
  - `memory.ts`: In-memory storage implementation
- `client/`: React components and SPA logic (entry: `client/index.html` → `client/main.tsx`)
- `common/types.ts`: Shared TypeScript types (`RequestRecord`, `JsonBody`)
- `opensearch/bucket-index.json`: OpenSearch index mapping definition

## Data Flow

1. HTTP requests to `/hook/{bucket}/*` are captured
2. Request data stored via storage adapter (OpenSearch or memory) with generated UUID
3. Web interface at `/bucket/{bucket}` displays captured requests
4. API endpoints serve request data from storage to React frontend
5. Client polls for new requests every 5 seconds using `/api/bucket/{bucket}/record/?since={timestamp}` (auto-refresh can be toggled)
6. New records are highlighted with a yellow background fade animation

## Code Style

- Uses Biome for linting and formatting
- Single quotes for JavaScript/TypeScript
- Space indentation
- Import organization enabled
