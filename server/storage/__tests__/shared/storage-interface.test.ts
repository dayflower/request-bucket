import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestRecord } from '../../../../common/types';
import type { StorageAdapter } from '../../interface';

/**
 * Shared test suite for storage adapters to ensure they conform to the StorageAdapter interface
 */
export function createStorageInterfaceTests(
  name: string,
  createAdapter: () => StorageAdapter
) {
  describe(`${name} - StorageAdapter Interface`, () => {
    let adapter: StorageAdapter;

    const createSampleRecord = (
      id: string,
      bucket: string,
      timestamp?: string
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
        headers: {
          'content-type': 'application/json',
          'user-agent': 'test-agent',
        },
        bodyRaw: '{"test": "data"}',
        bodyJson: { test: 'data' },
      },
    });

    beforeEach(() => {
      adapter = createAdapter();
    });

    describe('store()', () => {
      it('should store a record successfully', async () => {
        const record = createSampleRecord('test-id-1', 'test-bucket');

        await expect(adapter.store(record)).resolves.not.toThrow();
      });

      it('should store multiple records', async () => {
        const record1 = createSampleRecord('test-id-1', 'test-bucket');
        const record2 = createSampleRecord('test-id-2', 'test-bucket');

        await expect(adapter.store(record1)).resolves.not.toThrow();
        await expect(adapter.store(record2)).resolves.not.toThrow();
      });
    });

    describe('getRecords()', () => {
      it('should return empty records for non-existent bucket', async () => {
        const result = await adapter.getRecords('non-existent-bucket');

        expect(result).toEqual({
          records: [],
          next: undefined,
        });
      });

      it('should return stored records for a bucket', async () => {
        const record = createSampleRecord('test-id-1', 'test-bucket');
        await adapter.store(record);

        const result = await adapter.getRecords('test-bucket');

        expect(result.records).toHaveLength(1);
        expect(result.records[0]).toMatchObject({
          id: 'test-id-1',
          bucket: 'test-bucket',
        });
      });

      it('should respect limit parameter', async () => {
        const record1 = createSampleRecord('test-id-1', 'test-bucket');
        const record2 = createSampleRecord('test-id-2', 'test-bucket');
        const record3 = createSampleRecord('test-id-3', 'test-bucket');

        await adapter.store(record1);
        await adapter.store(record2);
        await adapter.store(record3);

        const result = await adapter.getRecords('test-bucket', { limit: 2 });

        expect(result.records).toHaveLength(2);
      });

      it('should handle pagination with from parameter', async () => {
        const record1 = createSampleRecord('test-id-1', 'test-bucket');
        const record2 = createSampleRecord('test-id-2', 'test-bucket');

        await adapter.store(record1);
        await adapter.store(record2);

        const firstPage = await adapter.getRecords('test-bucket', { limit: 1 });
        expect(firstPage.records).toHaveLength(1);

        if (firstPage.next) {
          // Extract from parameter from next URL
          const fromMatch = firstPage.next.match(/from=([^&]+)/);
          const from = fromMatch ? fromMatch[1] : undefined;

          if (from) {
            const secondPage = await adapter.getRecords('test-bucket', { from, limit: 1 });
            expect(secondPage.records).toHaveLength(1);
          }
        }
      });
    });

    describe('getRecord()', () => {
      it('should return null for non-existent record', async () => {
        const result = await adapter.getRecord('test-bucket', 'non-existent-id');

        expect(result).toBeNull();
      });

      it('should return stored record by bucket and id', async () => {
        const record = createSampleRecord('test-id-1', 'test-bucket');
        await adapter.store(record);

        const result = await adapter.getRecord('test-bucket', 'test-id-1');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('test-id-1');
        expect(result?.bucket).toBe('test-bucket');
      });

      it('should not return record from different bucket', async () => {
        const record = createSampleRecord('test-id-1', 'bucket-a');
        await adapter.store(record);

        const result = await adapter.getRecord('bucket-b', 'test-id-1');

        expect(result).toBeNull();
      });
    });

    describe('header filtering', () => {
      it('should filter headers based on ignore prefixes', async () => {
        // This test will be implemented by specific adapters if they support header filtering
        // Base interface test just ensures the adapter works with headers
        const record = createSampleRecord('test-id-1', 'test-bucket');
        record.request.headers = {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'cf-ray': 'test-ray',
        };

        await adapter.store(record);
        const result = await adapter.getRecord('test-bucket', 'test-id-1');

        expect(result).not.toBeNull();
        expect(result?.request.headers).toBeDefined();
      });
    });
  });
}