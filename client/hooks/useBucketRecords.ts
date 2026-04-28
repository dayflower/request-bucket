import { useCallback, useEffect, useRef, useState } from 'react';
import type { RequestRecord } from '../../common/types';

export type BucketRecord = RequestRecord & {
  loaded?: boolean;
  isNew?: boolean;
};

export interface UseBucketRecordsReturn {
  records: BucketRecord[];
  nextLink: string | null;
  latestTimestamp: string | null;
  error: string | null;
  loadedRef: React.RefObject<HTMLDivElement | null>;
  load: (from?: string) => Promise<void>;
  pollNewRecords: () => Promise<void>;
}

export function useBucketRecords(
  bucket: string | undefined,
): UseBucketRecordsReturn {
  const [records, setRecords] = useState<BucketRecord[]>([]);
  const [nextLink, setNextLink] = useState<string | null>(null);
  const [latestTimestamp, setLatestTimestamp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (from: string | undefined = undefined) => {
      if (bucket == null) {
        return;
      }

      const uri = from ?? `/api/bucket/${bucket}/record/`;

      try {
        const res = await fetch(uri, { method: 'GET' });
        if (res.ok) {
          setError(null);
          const body = await res.json();
          const loaded = body.records;

          setRecords((prev) => {
            const items = from != null ? [...prev, ...loaded] : loaded;
            if (from != null) {
              items[prev.length].loaded = true;
            }
            return items;
          });

          if (loaded.length > 0 && from == null) {
            setLatestTimestamp(loaded[0].timestamp);
          } else if (loaded.length === 0 && from == null) {
            setLatestTimestamp(new Date().toISOString());
          }

          setNextLink(body.next ?? null);

          if (from != null) {
            setTimeout(() => {
              loadedRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }, 100);
          }
        } else {
          setError('Failed to load records from storage.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load records from storage.');
      }
    },
    [bucket],
  );

  const pollNewRecords = useCallback(async () => {
    if (!bucket || !latestTimestamp) {
      return;
    }

    try {
      const res = await fetch(
        `/api/bucket/${bucket}/record/?since=${encodeURIComponent(latestTimestamp)}`,
        { method: 'GET' },
      );
      if (res.ok) {
        setError(null);
        const body = await res.json();
        const newRecords = body.records;

        if (newRecords.length > 0) {
          const markedRecords = newRecords.map((r: RequestRecord) => ({
            ...r,
            isNew: true,
          }));
          setRecords((prev) => [...markedRecords, ...prev]);
          setLatestTimestamp(newRecords[0].timestamp);
        }
      } else {
        setError('Auto-refresh failed: storage error.');
      }
    } catch (err) {
      console.error('Polling error:', err);
      setError('Auto-refresh failed: storage error.');
    }
  }, [bucket, latestTimestamp]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    records,
    nextLink,
    latestTimestamp,
    error,
    loadedRef,
    load,
    pollNewRecords,
  };
}
