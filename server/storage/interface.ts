import type { RequestRecord } from '../../common/types';

export interface StorageAdapter {
  /**
   * Store a request record
   */
  store(record: RequestRecord): Promise<void>;

  /**
   * Retrieve records for a bucket with pagination
   */
  getRecords(
    bucket: string,
    options?: {
      from?: string;
      limit?: number;
    }
  ): Promise<{
    records: RequestRecord[];
    next?: string;
  }>;

  /**
   * Retrieve a specific record by bucket and ID
   */
  getRecord(bucket: string, id: string): Promise<RequestRecord | null>;
}