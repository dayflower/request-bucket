import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { RequestRecord } from '../common/types';
import RecordingGuide from './RecordingGuide';
import RequestRecordComponent from './RequestRecordComponent';

function Bucket({ ...props }: React.ComponentProps<'div'>) {
  const { bucket } = useParams<{ bucket: string }>();
  const [records, setRecords] = useState<
    (RequestRecord & { loaded?: boolean; isNew?: boolean })[]
  >([]);
  const [nextLink, setNextLink] = useState<string | null>(null);
  const [isPollingEnabled, setIsPollingEnabled] = useState(false);
  const [latestTimestamp, setLatestTimestamp] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<HTMLDivElement>(null);

  const hasRecords = records != null && records.length > 0;

  const load = useCallback(
    async (from: string | undefined = undefined) => {
      if (bucket == null) {
        return;
      }

      const uri = from ?? `/api/bucket/${bucket}/record/`;

      try {
        const res = await fetch(uri, {
          method: 'GET',
        });
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

          if (body.next != null) {
            setNextLink(body.next);
          } else {
            setNextLink(null);
          }

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
    if (!bucket || !latestTimestamp || !isPollingEnabled) {
      return;
    }

    try {
      const res = await fetch(
        `/api/bucket/${bucket}/record/?since=${encodeURIComponent(latestTimestamp)}`,
        {
          method: 'GET',
        },
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
  }, [bucket, latestTimestamp, isPollingEnabled]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (bucket) {
      document.title = `request-bucket: ${bucket}`;
    }
    return () => {
      document.title = 'request-bucket';
    };
  }, [bucket]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Polling effect
  useEffect(() => {
    if (!isPollingEnabled || !latestTimestamp || !isTabVisible) {
      return;
    }

    const intervalId = setInterval(pollNewRecords, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [latestTimestamp, isPollingEnabled, isTabVisible, pollNewRecords]);

  return (
    <div {...props}>
      <h1>
        <Link to="/">request bucket</Link>: {bucket}
      </h1>

      {error && <p className="error-message">{error}</p>}

      <div className="controls">
        <button type="button" onClick={() => load()}>
          Refresh
        </button>

        <label>
          <input
            type="checkbox"
            checked={isPollingEnabled}
            onChange={(e) => setIsPollingEnabled(e.target.checked)}
          />
          Auto-refresh
        </label>
      </div>

      {bucket && (
        <details open={!hasRecords}>
          <summary>
            <h2>Guide</h2>
          </summary>

          <RecordingGuide bucketId={bucket} />
        </details>
      )}

      {hasRecords && <h2>Requests</h2>}

      {records?.map((record) => (
        <RequestRecordComponent
          ref={record.loaded ? loadedRef : undefined}
          key={record.id}
          id={record.id}
          data-osid={record._id}
          record={record}
          linkToItem={`/bucket/${record.bucket}/${record.id}`}
        />
      ))}

      {nextLink != null && (
        <button type="button" onClick={() => load(nextLink)}>
          Load more
        </button>
      )}
    </div>
  );
}

export default Bucket;
