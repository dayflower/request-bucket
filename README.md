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

- Node.js 22+
- OpenSearch instance

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
npm install
```

2. Set up environment variables (see Configuration section)

3. Build and run:
```bash
npm run build:client
npm run build:server
npm run prod
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

### OpenSearch Index Setup

Before running the application, you need to create the required index in OpenSearch with the proper mapping:

```bash
# Create the index with the required mapping
curl -X PUT "https://your-opensearch-endpoint/request-bucket" \
  -H "Content-Type: application/json" \
  -d @opensearch/bucket-index.json
```

The index mapping definition is available in [`opensearch/bucket-index.json`](opensearch/bucket-index.json) and defines the structure for storing webhook request data.

### Required Environment Variables

- `OPENSEARCH_ENDPOINT`
  - OpenSearch cluster endpoint
  - Example: `https://opensearch.example.com/`
- `OPENSEARCH_INDEX`
  - Index name for storing request data
  - Example: `request-bucket`

### Optional Environment Variables

- `OPENSEARCH_USERNAME`
  - OpenSearch authentication username
- `OPENSEARCH_PASSWORD`
  - OpenSearch authentication password
- `IGNORE_HEADER_PREFIX`
  - Comma-separated list of header prefixes to filter out
  - Example: `x-forwarded-,cf-`


## License

MIT
