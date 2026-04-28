import type { RequestRecord } from '../../common/types';
import type { StorageAdapter } from './interface';
import { filterHeaders } from './utils';

export class MemoryStorageAdapter implements StorageAdapter {
  // protected to allow test subclasses (e.g. TestableMemoryStorageAdapter) to access internals
  protected records: Map<string, RequestRecord[]> = new Map();
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

    // ISO 8601 strings are lexicographically orderable, no Date parsing needed
    bucketRecords.sort((a, b) =>
      b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0,
    );
  }

  async getRecords(
    bucket: string,
    options: { from?: string; limit?: number; since?: string } = {},
  ): Promise<{ records: RequestRecord[]; next?: string }> {
    const { from, limit = 5, since } = options;

    const bucketRecords = this.records.get(bucket) || [];

    let filteredRecords = bucketRecords;

    // Filter by 'since' parameter if provided (for polling)
    if (since != null && since.trim() !== '') {
      filteredRecords = bucketRecords.filter(
        (record) =>
          new Date(record.timestamp).getTime() > new Date(since).getTime(),
      );
    }
    // Otherwise, filter by 'from' parameter if provided (for pagination)
    else if (from != null && from.trim() !== '') {
      const fromIndex = bucketRecords.findIndex(
        (record) => record.timestamp === from,
      );
      if (fromIndex >= 0) {
        filteredRecords = bucketRecords.slice(fromIndex + 1);
      }
    }

    // Apply pagination
    const paginatedRecords = filteredRecords.slice(0, limit + 1);
    const records = paginatedRecords
      .slice(0, limit)
      .map((record) => filterHeaders(record, this.ignoreHeaderPrefixes));

    // Check if there are more records
    let next: string | undefined;
    if (paginatedRecords.length > limit) {
      const lastRecord = records[records.length - 1];
      if (lastRecord?.id) {
        next = `/api/bucket/${bucket}/record/?from=${encodeURIComponent(lastRecord.timestamp)}`;
      }
    }

    return { records, next };
  }

  async getRecord(bucket: string, id: string): Promise<RequestRecord | null> {
    const bucketRecords = this.records.get(bucket) || [];
    const record = bucketRecords.find((r) => r.id === id);

    return record ? filterHeaders(record, this.ignoreHeaderPrefixes) : null;
  }
}
