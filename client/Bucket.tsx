import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useBucketRecords } from './hooks/useBucketRecords';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { usePolling } from './hooks/usePolling';
import { useTabVisibility } from './hooks/useTabVisibility';
import RecordingGuide from './RecordingGuide';
import RequestRecordComponent from './RequestRecordComponent';

function Bucket({ ...props }: React.ComponentProps<'div'>) {
  const { bucket } = useParams<{ bucket: string }>();

  const {
    records,
    nextLink,
    latestTimestamp,
    error,
    loadedRef,
    load,
    pollNewRecords,
  } = useBucketRecords(bucket);

  const [isPollingEnabled, setIsPollingEnabled] = useState(false);
  const isTabVisible = useTabVisibility();

  useDocumentTitle(bucket ? `request-bucket: ${bucket}` : null);
  usePolling(
    pollNewRecords,
    5000,
    isPollingEnabled && !!latestTimestamp && isTabVisible,
  );

  const hasRecords = records.length > 0;

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

      {records.map((record) => (
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
