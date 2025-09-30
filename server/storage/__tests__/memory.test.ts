import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestRecord } from '../../../common/types';
import { MemoryStorageAdapter } from '../memory';
import { createStorageInterfaceTests } from './shared/storage-interface.test';

// Run shared interface tests
createStorageInterfaceTests('MemoryStorageAdapter', () => new MemoryStorageAdapter());

describe('MemoryStorageAdapter - Specific Implementation', () => {
  let adapter: MemoryStorageAdapter;

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
    adapter = new MemoryStorageAdapter();
  });

  describe('constructor', () => {
    it('should create adapter with no ignore prefixes by default', () => {
      const adapter = new MemoryStorageAdapter();
      expect(adapter).toBeInstanceOf(MemoryStorageAdapter);
    });

    it('should create adapter with ignore prefixes', () => {
      const adapter = new MemoryStorageAdapter(['x-forwarded-', 'cf-']);
      expect(adapter).toBeInstanceOf(MemoryStorageAdapter);
    });
  });

  describe('timestamp ordering', () => {
    it('should return records in descending timestamp order', async () => {
      const now = new Date();
      const record1 = createSampleRecord(
        'test-id-1',
        'test-bucket',
        new Date(now.getTime() - 2000).toISOString()
      );
      const record2 = createSampleRecord(
        'test-id-2',
        'test-bucket',
        new Date(now.getTime() - 1000).toISOString()
      );
      const record3 = createSampleRecord(
        'test-id-3',
        'test-bucket',
        now.toISOString()
      );

      // Store in non-chronological order
      await adapter.store(record2);
      await adapter.store(record1);
      await adapter.store(record3);

      const result = await adapter.getRecords('test-bucket');

      expect(result.records).toHaveLength(3);
      expect(result.records[0].id).toBe('test-id-3'); // Most recent
      expect(result.records[1].id).toBe('test-id-2');
      expect(result.records[2].id).toBe('test-id-1'); // Oldest
    });
  });

  describe('pagination', () => {
    it('should provide correct pagination with next parameter', async () => {
      const records = [];
      for (let i = 1; i <= 6; i++) {
        records.push(createSampleRecord(`test-id-${i}`, 'test-bucket'));
      }

      // Store all records
      for (const record of records) {
        await adapter.store(record);
      }

      // Get first page with limit 2
      const firstPage = await adapter.getRecords('test-bucket', { limit: 2 });

      expect(firstPage.records).toHaveLength(2);
      expect(firstPage.next).toBeDefined();
      expect(firstPage.next).toContain('from=');

      // Get second page
      const fromMatch = firstPage.next!.match(/from=([^&]+)/);
      const from = fromMatch![1];

      const secondPage = await adapter.getRecords('test-bucket', { from, limit: 2 });

      expect(secondPage.records).toHaveLength(2);
      expect(secondPage.next).toBeDefined();

      // Get third page
      const fromMatch2 = secondPage.next!.match(/from=([^&]+)/);
      const from2 = fromMatch2![1];

      const thirdPage = await adapter.getRecords('test-bucket', { from: from2, limit: 2 });

      expect(thirdPage.records).toHaveLength(2);
      expect(thirdPage.next).toBeUndefined(); // Last page

      // Ensure no duplicates across pages
      const allIds = [
        ...firstPage.records.map(r => r.id),
        ...secondPage.records.map(r => r.id),
        ...thirdPage.records.map(r => r.id)
      ];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(6);
    });

    it('should handle from parameter that does not exist', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      await adapter.store(record);

      const result = await adapter.getRecords('test-bucket', { from: 'non-existent-id' });

      expect(result.records).toHaveLength(1);
      expect(result.next).toBeUndefined();
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
      await adapter.store(record);

      const result = await adapter.getRecord('test-bucket', 'test-id-1');

      expect(result?.request.headers).toEqual(headers);
    });

    it('should filter headers with configured prefixes', async () => {
      const adapterWithFiltering = new MemoryStorageAdapter(['x-forwarded-', 'cf-']);

      const headers = {
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'x-forwarded-proto': 'https',
        'cf-ray': 'test-ray',
        'authorization': 'Bearer token'
      };

      const record = createSampleRecord('test-id-1', 'test-bucket', undefined, headers);
      await adapterWithFiltering.store(record);

      const result = await adapterWithFiltering.getRecord('test-bucket', 'test-id-1');

      expect(result?.request.headers).toEqual({
        'content-type': 'application/json',
        'authorization': 'Bearer token'
      });
    });

    it('should filter headers in getRecords as well', async () => {
      const adapterWithFiltering = new MemoryStorageAdapter(['x-', 'cf-']);

      const headers = {
        'content-type': 'application/json',
        'x-custom-header': 'value',
        'cf-ray': 'test-ray'
      };

      const record = createSampleRecord('test-id-1', 'test-bucket', undefined, headers);
      await adapterWithFiltering.store(record);

      const result = await adapterWithFiltering.getRecords('test-bucket');

      expect(result.records[0].request.headers).toEqual({
        'content-type': 'application/json'
      });
    });
  });

  describe('multiple buckets', () => {
    it('should isolate records between different buckets', async () => {
      const record1 = createSampleRecord('test-id-1', 'bucket-a');
      const record2 = createSampleRecord('test-id-2', 'bucket-b');
      const record3 = createSampleRecord('test-id-3', 'bucket-a');

      await adapter.store(record1);
      await adapter.store(record2);
      await adapter.store(record3);

      const bucketA = await adapter.getRecords('bucket-a');
      const bucketB = await adapter.getRecords('bucket-b');

      expect(bucketA.records).toHaveLength(2);
      expect(bucketB.records).toHaveLength(1);

      expect(bucketA.records.map(r => r.id)).toContain('test-id-1');
      expect(bucketA.records.map(r => r.id)).toContain('test-id-3');
      expect(bucketB.records[0].id).toBe('test-id-2');
    });
  });

  describe('utility methods', () => {
    describe('getBucketStats()', () => {
      it('should return empty stats for no buckets', () => {
        const stats = adapter.getBucketStats();
        expect(stats).toEqual({});
      });

      it('should return correct stats for multiple buckets', async () => {
        await adapter.store(createSampleRecord('id-1', 'bucket-a'));
        await adapter.store(createSampleRecord('id-2', 'bucket-a'));
        await adapter.store(createSampleRecord('id-3', 'bucket-b'));

        const stats = adapter.getBucketStats();

        expect(stats).toEqual({
          'bucket-a': 2,
          'bucket-b': 1
        });
      });
    });

    describe('clear()', () => {
      it('should clear all data', async () => {
        await adapter.store(createSampleRecord('id-1', 'bucket-a'));
        await adapter.store(createSampleRecord('id-2', 'bucket-b'));

        let stats = adapter.getBucketStats();
        expect(Object.keys(stats)).toHaveLength(2);

        adapter.clear();

        stats = adapter.getBucketStats();
        expect(stats).toEqual({});

        const result = await adapter.getRecords('bucket-a');
        expect(result.records).toHaveLength(0);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty bucket name', async () => {
      const result = await adapter.getRecords('');
      expect(result.records).toHaveLength(0);
    });

    it('should handle undefined from parameter', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      await adapter.store(record);

      const result = await adapter.getRecords('test-bucket', { from: undefined });
      expect(result.records).toHaveLength(1);
    });

    it('should handle empty string from parameter', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      await adapter.store(record);

      const result = await adapter.getRecords('test-bucket', { from: '' });
      expect(result.records).toHaveLength(1);
    });

    it('should handle whitespace-only from parameter', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      await adapter.store(record);

      const result = await adapter.getRecords('test-bucket', { from: '   ' });
      expect(result.records).toHaveLength(1);
    });
  });

  describe('since parameter filtering', () => {
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

      await adapter.store(record1);
      await adapter.store(record2);
      await adapter.store(record3);

      const sinceTimestamp = new Date(baseTime - 2500).toISOString();
      const result = await adapter.getRecords('test-bucket', { since: sinceTimestamp });

      expect(result.records).toHaveLength(2);
      expect(result.records[0].id).toBe('test-id-3');
      expect(result.records[1].id).toBe('test-id-2');
    });

    it('should return empty array when no records are newer than since', async () => {
      const now = new Date();
      const record = createSampleRecord(
        'test-id-1',
        'test-bucket',
        new Date(now.getTime() - 5000).toISOString()
      );

      await adapter.store(record);

      const sinceTimestamp = new Date(now.getTime() - 1000).toISOString();
      const result = await adapter.getRecords('test-bucket', { since: sinceTimestamp });

      expect(result.records).toHaveLength(0);
    });

    it('should return all records when since timestamp is older than all records', async () => {
      const now = new Date();
      const record1 = createSampleRecord(
        'test-id-1',
        'test-bucket',
        new Date(now.getTime() - 2000).toISOString()
      );
      const record2 = createSampleRecord(
        'test-id-2',
        'test-bucket',
        new Date(now.getTime() - 1000).toISOString()
      );

      await adapter.store(record1);
      await adapter.store(record2);

      const sinceTimestamp = new Date(now.getTime() - 5000).toISOString();
      const result = await adapter.getRecords('test-bucket', { since: sinceTimestamp });

      expect(result.records).toHaveLength(2);
    });

    it('should prioritize since over from parameter', async () => {
      const now = new Date();
      const record1 = createSampleRecord(
        'test-id-1',
        'test-bucket',
        new Date(now.getTime() - 3000).toISOString()
      );
      const record2 = createSampleRecord(
        'test-id-2',
        'test-bucket',
        new Date(now.getTime() - 2000).toISOString()
      );
      const record3 = createSampleRecord(
        'test-id-3',
        'test-bucket',
        new Date(now.getTime() - 1000).toISOString()
      );

      await adapter.store(record1);
      await adapter.store(record2);
      await adapter.store(record3);

      const sinceTimestamp = new Date(now.getTime() - 2500).toISOString();
      const result = await adapter.getRecords('test-bucket', {
        from: 'test-id-3',
        since: sinceTimestamp
      });

      // Should use since parameter, ignoring from
      expect(result.records).toHaveLength(2);
      expect(result.records[0].id).toBe('test-id-3');
      expect(result.records[1].id).toBe('test-id-2');
    });

    it('should handle empty string since parameter', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      await adapter.store(record);

      const result = await adapter.getRecords('test-bucket', { since: '' });
      expect(result.records).toHaveLength(1);
    });

    it('should handle whitespace-only since parameter', async () => {
      const record = createSampleRecord('test-id-1', 'test-bucket');
      await adapter.store(record);

      const result = await adapter.getRecords('test-bucket', { since: '   ' });
      expect(result.records).toHaveLength(1);
    });

    it('should respect limit parameter with since', async () => {
      const now = new Date();
      const baseTime = now.getTime();

      for (let i = 1; i <= 5; i++) {
        const record = createSampleRecord(
          `test-id-${i}`,
          'test-bucket',
          new Date(baseTime - (6000 - i * 1000)).toISOString()
        );
        await adapter.store(record);
      }

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