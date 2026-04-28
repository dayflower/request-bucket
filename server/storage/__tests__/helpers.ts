import type { RequestRecord } from '../../../common/types';
import { MemoryStorageAdapter } from '../memory';

export class TestableMemoryStorageAdapter extends MemoryStorageAdapter {
  getBucketStats(): { [bucket: string]: number } {
    const stats: { [bucket: string]: number } = {};
    for (const [bucket, records] of this.records) {
      stats[bucket] = records.length;
    }
    return stats;
  }

  clear(): void {
    this.records.clear();
  }
}

export const createSampleRecord = (
  id: string,
  bucket: string,
  timestamp?: string,
  headers?: Record<string, string>,
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
