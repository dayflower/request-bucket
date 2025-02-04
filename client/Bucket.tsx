import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { RequestRecord } from '../common/types';
import { RequestRecordComponent } from './RequestRecordComponent';

function Guide({
  bucket,
  ...props
}: React.ComponentProps<'div'> & { bucket: string }) {
  return (
    <div {...props}>
      <p>
        To record a webhook, send a request to <code>/hook/{bucket}</code>.
      </p>

      <p>For example:</p>

      <pre>
        curl \<br />
        &nbsp;&nbsp;&nbsp;&nbsp;-X POST \<br />
        &nbsp;&nbsp;&nbsp;&nbsp;-H 'Content-Type: application/json' \<br />
        &nbsp;&nbsp;&nbsp;&nbsp;-d '{'{'} "message": "Hello, world" {'}'}' \
        <br />
        &nbsp;&nbsp;&nbsp;&nbsp;/hook/{bucket}/some/optional/path
      </pre>
    </div>
  );
}

function Bucket({ ...props }: React.ComponentProps<'div'>) {
  const { bucket } = useParams<{ bucket: string }>();
  const [records, setRecords] = useState<RequestRecord[]>();

  const hasRecords = records != null && records.length > 0;

  const load = useCallback(async () => {
    if (bucket == null) {
      return;
    }

    try {
      const res = await fetch(`/api/bucket/${bucket}/record/`, {
        method: 'GET',
      });
      if (res.ok) {
        const records = await res.json();
        setRecords(records);
      }
    } catch (err) {
      console.error(err);
    }
  }, [bucket]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div {...props}>
      <h1>
        <Link to="/">request bucket</Link>: {bucket}
      </h1>

      <button type="button" onClick={load}>
        Reload
      </button>

      {bucket && (
        <details open={!hasRecords}>
          <summary>
            <h2>Guide</h2>
          </summary>
          <Guide bucket={bucket} />
        </details>
      )}

      {hasRecords && <h2>Requests</h2>}

      {records?.map((record) => (
        <RequestRecordComponent
          key={record.id}
          id={record.id}
          data-osid={record._id}
          record={record}
          linkToItem={`/bucket/${record.bucket}/${record.id}`}
        />
      ))}
    </div>
  );
}

export default Bucket;
