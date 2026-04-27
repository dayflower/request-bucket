# request-bucket

A self-hosted webhook inspection tool that captures HTTP requests for analysis and debugging.
View your webhooks in a clean web interface - a powerful alternative to RequestBin and similar services.

## Features

- Create named "buckets" to organize webhook requests
- Capture any HTTP request (GET, POST, PUT, DELETE, etc.) with full headers and body
- View captured requests in a clean web interface
- Export request data for analysis or debugging

Perfect for webhook development, API testing, and debugging third-party integrations.

## Prerequisites

- [Bun](https://bun.com) 1.3+
- OpenSearch instance (optional, defaults to in-memory storage)

## Quick Start

### Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e OPENSEARCH_ENDPOINT=https://your-opensearch-instance \
  -e OPENSEARCH_INDEX=request-bucket \
  dayflower/request-bucket
```

### From Source

1. Install dependencies:
```bash
bun install
```

2. Run with default in-memory storage:
```bash
bun run dev
```

Or build the client and run in production mode (see Configuration section for OpenSearch options):
```bash
bun run build
bun run start
```

## Usage

### Recording Requests

Send any HTTP request to `/hook/{bucket-name}`:

```bash
# Basic POST request
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"message": "Hello, world"}' \
  http://localhost:3000/hook/my-bucket

# With additional path segments
curl -X GET http://localhost:3000/hook/my-bucket/webhook/github

# Different HTTP methods
curl -X PUT http://localhost:3000/hook/my-bucket/api/update
curl -X DELETE http://localhost:3000/hook/my-bucket/api/remove
```

### Viewing Requests

1. Open your browser to `http://localhost:3000`
2. Navigate to `http://localhost:3000/bucket/{bucket-name}` to view your bucket
3. View all captured requests with full details including:
   - HTTP method and path
   - Headers
   - Query parameters
   - Request body (raw and parsed JSON)
   - Timestamps

## Configuration

### Storage Backends

The application supports multiple storage backends configured via the `STORAGE_TYPE` environment variable:

#### In-Memory Storage (Default)

```bash
# Default - no configuration required
bun run dev

# Or explicitly set
STORAGE_TYPE=memory bun run dev
```

**Note:** In-memory storage only works with single server instances and data is lost on restart. Perfect for development and testing.

#### OpenSearch Storage

```bash
STORAGE_TYPE=opensearch bun run dev
```

Before using OpenSearch storage, create the required index with the proper mapping:

```bash
# Create the index with the required mapping
curl -X PUT "https://your-opensearch-endpoint/request-bucket" \
  -H "Content-Type: application/json" \
  -d @opensearch/bucket-index.json
```

The index mapping definition is available in [`opensearch/bucket-index.json`](opensearch/bucket-index.json) and defines the structure for storing webhook request data.

### Environment Variables

#### Storage Configuration

- `STORAGE_TYPE`
  - Storage backend type: `memory` (default) or `opensearch`

#### OpenSearch Configuration (when STORAGE_TYPE=opensearch)

- `OPENSEARCH_ENDPOINT` (required)
  - OpenSearch cluster endpoint
  - Example: `https://opensearch.example.com/`
- `OPENSEARCH_INDEX` (required)
  - Index name for storing request data
  - Example: `request-bucket`
- `OPENSEARCH_USERNAME` (optional)
  - OpenSearch authentication username
- `OPENSEARCH_PASSWORD` (optional)
  - OpenSearch authentication password

#### Common Configuration

- `IGNORE_HEADER_PREFIX` (optional)
  - Comma-separated list of header prefixes to filter out
  - Example: `x-forwarded-,cf-`


## Logging

Access logs are printed to stdout for all requests:

```
[2024-01-01T12:00:00.000Z] POST /hook/my-bucket 200 12ms
[2024-01-01T12:00:00.001Z] GET /api/bucket/my-bucket/record/ 200 3ms
```

> **Note:** In development mode, SPA routes (`/`, `/bucket/*`, static assets) are not logged due to Bun's HTML module constraints.

## License

MIT
