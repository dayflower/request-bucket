import { describe, expect, it } from 'bun:test';
import { createSampleRecord } from '../../storage/__tests__/helpers';
import type { StorageAdapter } from '../../storage/interface';
import { createGetRecordHandler, createGetRecordsHandler } from '../api';

const makeRecordsRequest = (bucket: string, query = '') =>
  Object.assign(
    new Request(`http://localhost/api/bucket/${bucket}/record/${query}`),
    {
      params: { bucket },
    },
  ) as unknown as Bun.BunRequest<'/api/bucket/:bucket/record/'>;

const makeRecordRequest = (bucket: string, id: string) =>
  Object.assign(
    new Request(`http://localhost/api/bucket/${bucket}/record/${id}`),
    {
      params: { bucket, id },
    },
  ) as unknown as Bun.BunRequest<'/api/bucket/:bucket/record/:id'>;

const mockStorage = (overrides: Partial<StorageAdapter>): StorageAdapter => ({
  store: async () => {},
  getRecords: async () => ({ records: [] }),
  getRecord: async () => null,
  ...overrides,
});

describe('createGetRecordsHandler', () => {
  it('returns 200 with records on success', async () => {
    const record = createSampleRecord('id-1', 'test-bucket');
    const storage = mockStorage({
      getRecords: async () => ({ records: [record] }),
    });

    const handler = createGetRecordsHandler(storage);
    const res = await handler(makeRecordsRequest('test-bucket'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records).toHaveLength(1);
    expect(body.records[0].id).toBe('id-1');
  });

  it('returns 500 when storage throws', async () => {
    const storage = mockStorage({
      getRecords: async () => {
        throw new Error('OpenSearch error: 503');
      },
    });

    const handler = createGetRecordsHandler(storage);
    const res = await handler(makeRecordsRequest('test-bucket'));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Internal server error');
  });
});

describe('createGetRecordHandler', () => {
  it('returns 200 with record on success', async () => {
    const record = createSampleRecord('id-1', 'test-bucket');
    const storage = mockStorage({
      getRecord: async () => record,
    });

    const handler = createGetRecordHandler(storage);
    const res = await handler(makeRecordRequest('test-bucket', 'id-1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('id-1');
  });

  it('returns 404 when record is not found', async () => {
    const storage = mockStorage({
      getRecord: async () => null,
    });

    const handler = createGetRecordHandler(storage);
    const res = await handler(makeRecordRequest('test-bucket', 'missing'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe('Record not found');
  });

  it('returns 500 when storage throws', async () => {
    const storage = mockStorage({
      getRecord: async () => {
        throw new Error('OpenSearch error: 503');
      },
    });

    const handler = createGetRecordHandler(storage);
    const res = await handler(makeRecordRequest('test-bucket', 'id-1'));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Internal server error');
  });
});
