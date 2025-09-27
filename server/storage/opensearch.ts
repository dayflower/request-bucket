import { Client } from '@opensearch-project/opensearch';
import type { RequestRecord } from '../../common/types';
import type { StorageAdapter } from './interface';

export class OpenSearchStorageAdapter implements StorageAdapter {
  private client: Client;
  private index: string;
  private ignoreHeaderPrefixes: string[];

  constructor(
    endpoint: string,
    index: string,
    auth?: { username: string; password: string },
    ignoreHeaderPrefixes: string[] = []
  ) {
    this.client = new Client({
      node: endpoint,
      ...(auth ? { auth } : {}),
    });
    this.index = index;
    this.ignoreHeaderPrefixes = ignoreHeaderPrefixes;
  }

  async store(record: RequestRecord): Promise<void> {
    const res = await this.client.index({
      index: this.index,
      body: record,
      refresh: true,
    });

    if (res.statusCode !== 201) {
      throw new Error(`Failed to store record: ${res.statusCode}`);
    }
  }

  async getRecords(
    bucket: string,
    options: { from?: string; limit?: number } = {}
  ): Promise<{ records: RequestRecord[]; next?: string }> {
    const { from, limit = 5 } = options;

    const condition: Record<string, unknown>[] = [
      {
        term: {
          bucket,
        },
      },
    ];

    if (from != null && from.trim() !== '') {
      condition.push({
        range: {
          id: {
            lte: from,
          },
        },
      });
    }

    const res = await this.client.search({
      index: this.index,
      body: {
        size: limit + 1,
        query: {
          bool: {
            filter: condition,
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

    if (res.statusCode !== 200) {
      return { records: [] };
    }

    const hits = res.body.hits.hits
      .filter((hit: any) => hit._source != null)
      .map((hit: any) => ({ ...hit._source, _id: hit._id }) as RequestRecord)
      .map((record) => this.filterHeaders(record));

    if (hits.length > limit) {
      const last = hits.pop();
      const nextFrom = last?.id;
      if (nextFrom != null) {
        return {
          records: hits,
          next: `/api/bucket/${bucket}/record/?from=${nextFrom}`,
        };
      }
    }

    return { records: hits };
  }

  async getRecord(bucket: string, id: string): Promise<RequestRecord | null> {
    const res = await this.client.search({
      index: this.index,
      body: {
        size: 1,
        query: {
          bool: {
            must: [
              {
                term: {
                  bucket,
                },
              },
              {
                term: {
                  id,
                },
              },
            ],
          },
        },
      },
    });

    if (res.statusCode !== 200) {
      return null;
    }

    const records = res.body.hits.hits
      .filter((hit: any) => hit._source != null)
      .map((hit: any) => ({ ...hit._source, _id: hit._id }))
      .map((record: RequestRecord) => this.filterHeaders(record));

    return records.length > 0 ? records[0] : null;
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
}