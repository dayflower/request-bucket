import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestRecord } from '../../../common/types';
import { OpenSearchStorageAdapter } from '../opensearch';
import { createStorageInterfaceTests } from './shared/storage-interface.test';

interface TermCondition {
  term?: {
    bucket?: string;
    id?: string;
  };
}

interface RangeCondition {
  range?: {
    id?: {
      lte?: string;
    };
    timestamp?: {
      gt?: string;
    };
  };
}

type QueryCondition = TermCondition | RangeCondition;

interface SearchRequestBody {
  size?: number;
  query?: {
    bool?: {
      must?: QueryCondition[];
      filter?: QueryCondition[];
    };
  };
  sort?: Array<Record<string, { order: string }>>;
}

// Mock the OpenSearch client
const mockIndex = vi.fn();
const mockSearch = vi.fn();

vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn(() => ({
    index: mockIndex,
    search: mockSearch,
  })),
}));

// Mock response helpers
const createMockIndexResponse = (statusCode: number = 201) => ({
  statusCode,
  body: {
    _index: 'test-index',
    _id: 'doc-id',
    _version: 1,
    result: 'created',
  },
});

const createMockSearchResponse = (
  records: RequestRecord[],
  statusCode: number = 200
) => ({
  statusCode,
  body: {
    hits: {
      total: { value: records.length },
      hits: records.map((record, index) => ({
        _index: 'test-index',
        _id: `doc-id-${index}`,
        _source: record,
      })),
    },
  },
});

const createMockErrorResponse = (statusCode: number = 500, error?: string) => ({
  statusCode,
  body: {
    error: {
      type: 'exception',
      reason: error || 'Internal server error',
    },
  },
});

// Shared storage for interface tests
let sharedStoredRecords: RequestRecord[] = [];

// Run shared interface tests with mocked adapter
createStorageInterfaceTests('OpenSearchStorageAdapter', () => {
  // Reset mocks and storage before each test
  mockIndex.mockClear();
  mockSearch.mockClear();
  sharedStoredRecords = [];

  mockIndex.mockImplementation(async ({ body }: { body: RequestRecord }) => {
    sharedStoredRecords.push(body);
    return createMockIndexResponse();
  });

  mockSearch.mockImplementation(async ({ body }: { body: SearchRequestBody }) => {
    // Check for single record search (has `must` array with id term)
    const mustConditions = body.query?.bool?.must;
    const filterConditions = body.query?.bool?.filter;

    if (mustConditions && Array.isArray(mustConditions)) {
      // Single record search: getRecord()
      const bucketTerm = mustConditions.find((f): f is TermCondition => 'term' in f && f.term?.bucket !== undefined)?.term?.bucket;
      const idTerm = mustConditions.find((f): f is TermCondition => 'term' in f && f.term?.id !== undefined)?.term?.id;

      if (bucketTerm && idTerm) {
        const record = sharedStoredRecords.find(r => r.bucket === bucketTerm && r.id === idTerm);
        return createMockSearchResponse(record ? [record] : []);
      }
    }

    if (filterConditions && Array.isArray(filterConditions)) {
      // Multiple records search: getRecords()
      const bucketTerm = filterConditions.find((f): f is TermCondition => 'term' in f && f.term?.bucket !== undefined)?.term?.bucket;

      const bucketRecords = sharedStoredRecords.filter(r => r.bucket === bucketTerm);

      // Sort by timestamp descending to match OpenSearch behavior
      bucketRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const limit = body.size ? body.size - 1 : 5; // Adjust for pagination detection
      const from = filterConditions.find((f): f is RangeCondition => 'range' in f && f.range?.id !== undefined)?.range?.id?.lte;

      let filteredRecords = bucketRecords;
      if (from) {
        const fromIndex = bucketRecords.findIndex(r => r.id === from);
        if (fromIndex >= 0) {
          filteredRecords = bucketRecords.slice(fromIndex + 1);
        }
      }

      const paginatedRecords = filteredRecords.slice(0, limit);
      return createMockSearchResponse(paginatedRecords);
    }

    // Fallback
    return createMockSearchResponse([]);
  });

  return new OpenSearchStorageAdapter(
    'https://test-opensearch:9200',
    'test-index'
  );
});

describe('OpenSearchStorageAdapter - Specific Implementation', () => {
  let adapter: OpenSearchStorageAdapter;

  const createSampleRecord = (
    id: string,
    bucket: string,
    timestamp?: string,
    headers?: Record<string, string>
  ): RequestRecord => ({
    id,
    timestamp: timestamp || new Date().toISOString(),
    bucket,
    request: {
      method: 'POST',
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      pathQuery: `/hook/${bucket}/test`,
      path: `/hook/${bucket}/test`,
      args: '/test',
      queryString: '',
      query: {},
      headers: headers || {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      },
      bodyRaw: '{"test": "data"}',
      bodyJson: { test: 'data' },
    },
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    adapter = new OpenSearchStorageAdapter(
      'https://test-opensearch:9200',
      'test-index'
    );
  });

  describe('constructor', () => {
    it('should create adapter with endpoint and index', () => {
      const adapter = new OpenSearchStorageAdapter(
        'https://opensearch.example.com',
        'my-index'
      );
      expect(adapter).toBeInstanceOf(OpenSearchStorageAdapter);
    });

    it('should create adapter with authentication', () => {
      const adapter = new OpenSearchStorageAdapter(
        'https://opensearch.example.com',
        'my-index',
        { username: 'user', password: 'pass' }
      );
      expect(adapter).toBeInstanceOf(OpenSearchStorageAdapter);
    });

    it('should create adapter with header filtering', () => {
      const adapter = new OpenSearchStorageAdapter(
        'https://opensearch.example.com',
        'my-index',
        undefined,
        ['x-forwarded-', 'cf-']
      );
      expect(adapter).toBeInstanceOf(OpenSearchStorageAdapter);
    });
  });

  describe('store()', () => {
    it('should call OpenSearch index API with correct parameters', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      mockIndex.mockResolvedValue(createMockIndexResponse(201));

      await adapter.store(record);

      expect(mockIndex).toHaveBeenCalledWith({
        index: 'test-index',
        body: record,
        refresh: true,
      });
    });

    it('should handle successful index response', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      mockIndex.mockResolvedValue(createMockIndexResponse(201));

      await expect(adapter.store(record)).resolves.not.toThrow();
    });

    it('should throw error when index fails', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      mockIndex.mockResolvedValue(createMockIndexResponse(500));

      await expect(adapter.store(record)).rejects.toThrow('Failed to store record: 500');
    });

    it('should handle OpenSearch client errors', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      mockIndex.mockRejectedValue(new Error('Connection failed'));

      await expect(adapter.store(record)).rejects.toThrow('Connection failed');
    });
  });

  describe('getRecords()', () => {
    it('should call OpenSearch search API with correct query structure', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket);

      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6, // Default limit (5) + 1 for pagination
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should include from parameter in query when provided', async () => {
      const bucket = 'test-bucket';
      const from = 'test-from-id';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { from });

      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
                {
                  range: {
                    id: {
                      lte: 'test-from-id',
                    },
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should return parsed records from OpenSearch response', async () => {
      const bucket = 'test-bucket';
      const mockRecords = [
        createSampleRecord('id-1', bucket),
        createSampleRecord('id-2', bucket),
      ];
      mockSearch.mockResolvedValue(createMockSearchResponse(mockRecords));

      const result = await adapter.getRecords(bucket);

      expect(result.records).toHaveLength(2);
      expect(result.records[0].id).toBe('id-1');
      expect(result.records[1].id).toBe('id-2');
      expect(result.next).toBeUndefined();
    });

    it('should handle pagination when more records available', async () => {
      const bucket = 'test-bucket';
      const mockRecords = Array.from({ length: 6 }, (_, i) =>
        createSampleRecord(`id-${i + 1}`, bucket)
      );
      mockSearch.mockResolvedValue(createMockSearchResponse(mockRecords));

      const result = await adapter.getRecords(bucket, { limit: 5 });

      expect(result.records).toHaveLength(5);
      expect(result.next).toBe(`/api/bucket/${bucket}/record/?from=id-6`);
    });

    it('should return empty array when OpenSearch returns error', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue(createMockErrorResponse(404));

      const result = await adapter.getRecords(bucket);

      expect(result.records).toEqual([]);
    });

    it('should handle OpenSearch client errors gracefully', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockRejectedValue(new Error('Connection timeout'));

      await expect(adapter.getRecords(bucket)).rejects.toThrow('Connection timeout');
    });
  });

  describe('getRecord()', () => {
    it('should call OpenSearch search API with correct single record query', async () => {
      const bucket = 'test-bucket';
      const id = 'test-id';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecord(bucket, id);

      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 1,
          query: {
            bool: {
              must: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
                {
                  term: {
                    id: 'test-id',
                  },
                },
              ],
            },
          },
        },
      });
    });

    it('should return record when found', async () => {
      const bucket = 'test-bucket';
      const id = 'test-id';
      const mockRecord = createSampleRecord(id, bucket);
      mockSearch.mockResolvedValue(createMockSearchResponse([mockRecord]));

      const result = await adapter.getRecord(bucket, id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(id);
      expect(result?.bucket).toBe(bucket);
    });

    it('should return null when record not found', async () => {
      const bucket = 'test-bucket';
      const id = 'non-existent-id';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      const result = await adapter.getRecord(bucket, id);

      expect(result).toBeNull();
    });

    it('should return null when OpenSearch returns error', async () => {
      const bucket = 'test-bucket';
      const id = 'test-id';
      mockSearch.mockResolvedValue(createMockErrorResponse(404));

      const result = await adapter.getRecord(bucket, id);

      expect(result).toBeNull();
    });

    it('should return null when response has malformed structure', async () => {
      const bucket = 'test-bucket';
      const id = 'test-id';
      mockSearch.mockResolvedValue({
        statusCode: 200,
        body: {
          // Missing hits structure
          something: 'unexpected'
        }
      });

      const result = await adapter.getRecord(bucket, id);

      expect(result).toBeNull();
    });
  });

  describe('header filtering', () => {
    it('should not filter headers when no prefixes are configured', async () => {
      const headers = {
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'cf-ray': 'test-ray',
        'authorization': 'Bearer token'
      };

      const record = createSampleRecord('test-id-1', 'test-bucket', undefined, headers);
      mockSearch.mockResolvedValue(createMockSearchResponse([record]));

      const result = await adapter.getRecord('test-bucket', 'test-id-1');

      expect(result?.request.headers).toEqual(headers);
    });

    it('should filter headers with configured prefixes in getRecord', async () => {
      const adapterWithFiltering = new OpenSearchStorageAdapter(
        'https://test-opensearch:9200',
        'test-index',
        undefined,
        ['x-forwarded-', 'cf-']
      );

      const headers = {
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'x-forwarded-proto': 'https',
        'cf-ray': 'test-ray',
        'authorization': 'Bearer token'
      };

      const record = createSampleRecord('test-id-1', 'test-bucket', undefined, headers);
      mockSearch.mockResolvedValue(createMockSearchResponse([record]));

      const result = await adapterWithFiltering.getRecord('test-bucket', 'test-id-1');

      expect(result?.request.headers).toEqual({
        'content-type': 'application/json',
        'authorization': 'Bearer token'
      });
    });

    it('should filter headers with configured prefixes in getRecords', async () => {
      const adapterWithFiltering = new OpenSearchStorageAdapter(
        'https://test-opensearch:9200',
        'test-index',
        undefined,
        ['x-', 'cf-']
      );

      const headers = {
        'content-type': 'application/json',
        'x-custom-header': 'value',
        'cf-ray': 'test-ray'
      };

      const record = createSampleRecord('test-id-1', 'test-bucket', undefined, headers);
      mockSearch.mockResolvedValue(createMockSearchResponse([record]));

      const result = await adapterWithFiltering.getRecords('test-bucket');

      expect(result.records[0].request.headers).toEqual({
        'content-type': 'application/json'
      });
    });
  });

  describe('pagination edge cases', () => {
    it('should handle empty from parameter correctly', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { from: '' });

      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should handle whitespace-only from parameter', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { from: '   ' });

      // Should NOT include the range filter since trimmed string is empty
      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should use custom limit parameter', async () => {
      const bucket = 'test-bucket';
      const customLimit = 10;
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { limit: customLimit });

      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: customLimit + 1, // +1 for pagination detection
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });
  });

  describe('error scenarios', () => {
    it('should handle malformed OpenSearch response', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue({
        statusCode: 200,
        body: {
          // Missing hits structure
          something: 'unexpected'
        }
      });

      const result = await adapter.getRecords(bucket);

      expect(result.records).toEqual([]);
    });

    it('should handle OpenSearch response with null _source', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue({
        statusCode: 200,
        body: {
          hits: {
            hits: [
              { _source: null, _id: 'doc-1' },
              { _source: undefined, _id: 'doc-2' },
              { _source: createSampleRecord('id-3', bucket), _id: 'doc-3' }
            ]
          }
        }
      });

      const result = await adapter.getRecords(bucket);

      expect(result.records).toHaveLength(1);
      expect(result.records[0].id).toBe('id-3');
    });

    it('should handle network timeout errors', async () => {
      const record = createSampleRecord('test-id', 'test-bucket');
      mockIndex.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(adapter.store(record)).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle authentication errors', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue({
        statusCode: 401,
        body: {
          error: {
            type: 'security_exception',
            reason: 'Authentication required'
          }
        }
      });

      const result = await adapter.getRecords(bucket);

      expect(result.records).toEqual([]);
    });

    it('should handle index not found errors', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue({
        statusCode: 404,
        body: {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index [test-index]'
          }
        }
      });

      const result = await adapter.getRecords(bucket);

      expect(result.records).toEqual([]);
    });
  });

  describe('OpenSearch client initialization', () => {
    it('should initialize client with correct endpoint', () => {
      // This test verifies the mocking is working correctly
      const adapter = new OpenSearchStorageAdapter(
        'https://my-opensearch:9200',
        'my-index'
      );

      expect(adapter).toBeInstanceOf(OpenSearchStorageAdapter);
    });

    it('should initialize client with authentication', () => {
      const adapter = new OpenSearchStorageAdapter(
        'https://my-opensearch:9200',
        'my-index',
        { username: 'testuser', password: 'testpass' }
      );

      expect(adapter).toBeInstanceOf(OpenSearchStorageAdapter);
    });
  });

  describe('since parameter filtering', () => {
    it('should include since parameter in query when provided', async () => {
      const bucket = 'test-bucket';
      const since = '2024-01-01T00:00:00.000Z';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { since });

      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
                {
                  range: {
                    timestamp: {
                      gt: since,
                    },
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should return only records newer than the since timestamp', async () => {
      const now = new Date();
      const baseTime = now.getTime();

      const record1 = createSampleRecord(
        'test-id-1',
        'test-bucket',
        new Date(baseTime - 3000).toISOString()
      );
      const record2 = createSampleRecord(
        'test-id-2',
        'test-bucket',
        new Date(baseTime - 2000).toISOString()
      );
      const record3 = createSampleRecord(
        'test-id-3',
        'test-bucket',
        new Date(baseTime - 1000).toISOString()
      );

      const sinceTimestamp = new Date(baseTime - 2500).toISOString();

      // Mock the search to filter by timestamp
      mockSearch.mockImplementation(async ({ body }: { body: SearchRequestBody }) => {
        const filterConditions = body.query?.bool?.filter;
        const timestampRange = filterConditions?.find((f): f is RangeCondition => 'range' in f && f.range?.timestamp !== undefined);

        let records = [record1, record2, record3];

        if (timestampRange?.range?.timestamp) {
          const gtTimestamp = timestampRange.range.timestamp.gt;
          if (gtTimestamp) {
            records = records.filter(r =>
              new Date(r.timestamp).getTime() > new Date(gtTimestamp).getTime()
            );
          }
        }

        // Sort by timestamp descending
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return createMockSearchResponse(records);
      });

      const result = await adapter.getRecords('test-bucket', { since: sinceTimestamp });

      expect(result.records).toHaveLength(2);
      expect(result.records[0].id).toBe('test-id-3');
      expect(result.records[1].id).toBe('test-id-2');
    });

    it('should return empty array when no records are newer than since', async () => {
      const now = new Date();
      const oldRecord = createSampleRecord(
        'test-id-1',
        'test-bucket',
        new Date(now.getTime() - 5000).toISOString()
      );

      mockSearch.mockImplementation(async ({ body }: { body: SearchRequestBody }) => {
        const filterConditions = body.query?.bool?.filter;
        const timestampRange = filterConditions?.find((f): f is RangeCondition => 'range' in f && f.range?.timestamp !== undefined);

        if (timestampRange?.range?.timestamp) {
          const gtTimestamp = timestampRange.range.timestamp.gt;
          if (gtTimestamp && new Date(oldRecord.timestamp).getTime() <= new Date(gtTimestamp).getTime()) {
            return createMockSearchResponse([]);
          }
        }

        return createMockSearchResponse([oldRecord]);
      });

      const sinceTimestamp = new Date(now.getTime() - 1000).toISOString();
      const result = await adapter.getRecords('test-bucket', { since: sinceTimestamp });

      expect(result.records).toHaveLength(0);
    });

    it('should prioritize since over from parameter', async () => {
      const bucket = 'test-bucket';
      const since = '2024-01-01T00:00:00.000Z';
      const from = 'test-from-id';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { from, since });

      // Should have timestamp range but not id range
      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
                {
                  range: {
                    timestamp: {
                      gt: since,
                    },
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should handle empty string since parameter', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { since: '' });

      // Should not include timestamp range filter for empty string
      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should handle whitespace-only since parameter', async () => {
      const bucket = 'test-bucket';
      mockSearch.mockResolvedValue(createMockSearchResponse([]));

      await adapter.getRecords(bucket, { since: '   ' });

      // Should not include timestamp range filter for whitespace-only string
      expect(mockSearch).toHaveBeenCalledWith({
        index: 'test-index',
        body: {
          size: 6,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bucket: 'test-bucket',
                  },
                },
              ],
            },
          },
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
        },
      });
    });

    it('should respect limit parameter with since', async () => {
      const now = new Date();
      const baseTime = now.getTime();

      const records = Array.from({ length: 5 }, (_, i) =>
        createSampleRecord(
          `test-id-${i + 1}`,
          'test-bucket',
          new Date(baseTime - (5000 - i * 1000)).toISOString()
        )
      );

      mockSearch.mockImplementation(async ({ body }: { body: SearchRequestBody }) => {
        const limit = (body.size ?? 6) - 1; // Adjust for pagination detection
        const filterConditions = body.query?.bool?.filter;
        const timestampRange = filterConditions?.find((f): f is RangeCondition => 'range' in f && f.range?.timestamp !== undefined);

        let filteredRecords = records;

        if (timestampRange?.range?.timestamp) {
          const gtTimestamp = timestampRange.range.timestamp.gt;
          if (gtTimestamp) {
            filteredRecords = records.filter(r =>
              new Date(r.timestamp).getTime() > new Date(gtTimestamp).getTime()
            );
          }
        }

        // Sort by timestamp descending
        filteredRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Return all records (including pagination detection record)
        return createMockSearchResponse(filteredRecords.slice(0, limit + 1));
      });

      const sinceTimestamp = new Date(baseTime - 6000).toISOString();
      const result = await adapter.getRecords('test-bucket', {
        since: sinceTimestamp,
        limit: 2
      });

      expect(result.records).toHaveLength(2);
      expect(result.next).toBeDefined();
    });
  });
});