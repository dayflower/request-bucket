# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Request-bucket is a self-hosted webhook inspection tool built with Node.js, TypeScript, React, and OpenSearch. It captures HTTP requests for analysis and debugging, similar to RequestBin.

## Key Architecture

- **Server**: Fastify-based API server with pluggable storage backend
- **Client**: React SPA with React Router for the web interface
- **Common**: Shared TypeScript types between client and server
- **Spaghetti**: Custom framework for integrating server and SPA builds
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

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Production build and run
npm run build:client
npm run build:server
npm run prod

# Testing (using Vitest)
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Linting (using Biome)
npm run lint

# Clean build artifacts
npm run clean

# Preview built client
npm run preview
```

## Build Process

The project uses a dual-build approach:
1. **Client**: Vite builds React SPA to `dist/`
2. **Server**: esbuild bundles server code to `dist/index.mjs`

## Key File Structure

- `server/main.ts`: Core Fastify routes using storage abstraction
- `server/storage/`: Storage abstraction layer
  - `interface.ts`: Storage adapter interface
  - `factory.ts`: Storage factory and configuration
  - `opensearch.ts`: OpenSearch storage implementation
  - `memory.ts`: In-memory storage implementation
- `client/`: React components and SPA logic
- `common/types.ts`: Shared TypeScript types (`RequestRecord`, `JsonBody`)
- `lib/spaghetti/`: Custom framework for server/client integration
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