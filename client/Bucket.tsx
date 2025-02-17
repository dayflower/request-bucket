import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { RequestRecord } from '../common/types';
import RecordingGuide from './RecordingGuide';
import RequestRecordComponent from './RequestRecordComponent';

function Bucket({ ...props }: React.ComponentProps<'div'>) {
  const { bucket } = useParams<{ bucket: string }>();
  const [records, setRecords] = useState<
    (RequestRecord & { loaded?: boolean })[]
  >([]);
  const [nextLink, setNextLink] = useState<string | null>(null);
  const loadedRef = useRef<HTMLDivElement>(null);

  const hasRecords = records != null && records.length > 0;

  const load = async (from: string | undefined = undefined) => {
    if (bucket == null) {
      return;
    }

    const uri = from ?? `/api/bucket/${bucket}/record/`;

    try {
      const res = await fetch(uri, {
        method: 'GET',
      });
      if (res.ok) {
        const body = await res.json();

        const loaded = body.records;
        const items = from != null ? [...records, ...loaded] : loaded;
        if (from != null) {
          items[records.length].loaded = true;
        }

        setRecords(items);

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
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div {...props}>
      <h1>
        <Link to="/">request bucket</Link>: {bucket}
      </h1>

      <button type="button" onClick={() => load()}>
        Reload
      </button>

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
