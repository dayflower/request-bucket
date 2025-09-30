import type { RequestRecord } from '../../common/types';
import type { StorageAdapter } from './interface';

export class MemoryStorageAdapter implements StorageAdapter {
  private records: Map<string, RequestRecord[]> = new Map();
  private ignoreHeaderPrefixes: string[];

  constructor(ignoreHeaderPrefixes: string[] = []) {
    this.ignoreHeaderPrefixes = ignoreHeaderPrefixes;
  }

  async store(record: RequestRecord): Promise<void> {
    const { bucket } = record;

    if (!this.records.has(bucket)) {
      this.records.set(bucket, []);
    }

    const bucketRecords = this.records.get(bucket) as RequestRecord[];
    bucketRecords.push(record);

    // Sort by timestamp descending to maintain order
    bucketRecords.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getRecords(
    bucket: string,
    options: { from?: string; limit?: number; since?: string } = {}
  ): Promise<{ records: RequestRecord[]; next?: string }> {
    const { from, limit = 5, since } = options;

    const bucketRecords = this.records.get(bucket) || [];

    let filteredRecords = bucketRecords;

    // Filter by 'since' parameter if provided (for polling)
    if (since != null && since.trim() !== '') {
      filteredRecords = bucketRecords.filter(record =>
        new Date(record.timestamp).getTime() > new Date(since).getTime()
      );
    }
    // Otherwise, filter by 'from' parameter if provided (for pagination)
    else if (from != null && from.trim() !== '') {
      const fromIndex = bucketRecords.findIndex(record => record.id === from);
      if (fromIndex >= 0) {
        filteredRecords = bucketRecords.slice(fromIndex + 1);
      }
    }

    // Apply pagination
    const paginatedRecords = filteredRecords.slice(0, limit + 1);
    const records = paginatedRecords.slice(0, limit)
      .map(record => this.filterHeaders(record));

    // Check if there are more records
    let next: string | undefined;
    if (paginatedRecords.length > limit) {
      const lastRecord = records[records.length - 1];
      if (lastRecord?.id) {
        next = `/api/bucket/${bucket}/record/?from=${lastRecord.id}`;
      }
    }

    return { records, next };
  }

  async getRecord(bucket: string, id: string): Promise<RequestRecord | null> {
    const bucketRecords = this.records.get(bucket) || [];
    const record = bucketRecords.find(r => r.id === id);

    return record ? this.filterHeaders(record) : null;
  }

  private filterHeaders(item: RequestRecord): RequestRecord {
    if (this.ignoreHeaderPrefixes.length === 0) {
      return item;
    }

    const headers = Object.fromEntries(
      Object.entries(item.request.headers).filter(
        ([key]) => !this.ignoreHeaderPrefixes.some((prefix) => key.startsWith(prefix))
      )
    );

    return { ...item, request: { ...item.request, headers } };
  }

  // Utility method for debugging/monitoring
  getBucketStats(): { [bucket: string]: number } {
    const stats: { [bucket: string]: number } = {};
    for (const [bucket, records] of this.records) {
      stats[bucket] = records.length;
    }
    return stats;
  }

  // Clear all data (useful for testing)
  clear(): void {
    this.records.clear();
  }
}