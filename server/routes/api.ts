import type { StorageAdapter } from '../storage/interface';

const ITEMS_PER_PAGE = 5;

export const createGetRecordsHandler = (storage: StorageAdapter) => {
  return async (
    req: Bun.BunRequest<'/api/bucket/:bucket/record/'>,
  ): Promise<Response> => {
    const { bucket } = req.params;
    const url = new URL(req.url);
    const from = url.searchParams.get('from') ?? undefined;
    const since = url.searchParams.get('since') ?? undefined;

    try {
      const result = await storage.getRecords(bucket, {
        from,
        since,
        limit: ITEMS_PER_PAGE,
      });
      return Response.json(result);
    } catch (error) {
      console.error('Failed to get records:', error);
      return Response.json({ records: [] });
    }
  };
};

export const createGetRecordHandler = (storage: StorageAdapter) => {
  return async (
    req: Bun.BunRequest<'/api/bucket/:bucket/record/:id'>,
  ): Promise<Response> => {
    const { bucket, id } = req.params;

    try {
      const record = await storage.getRecord(bucket, id);
      if (!record) {
        return Response.json({ message: 'Record not found' }, { status: 404 });
      }
      return Response.json(record);
    } catch (error) {
      console.error('Failed to get record:', error);
      return Response.json({ message: 'Record not found' }, { status: 404 });
    }
  };
};
