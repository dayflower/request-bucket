import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { JsonBody, RequestRecord } from '../common/types';

function toUpperTokenHead(src: string): string {
  return src
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

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

function Headers({ headers }: { headers: Record<string, string> }) {
  return (
    <div className="headers">
      <table>
        <tbody>
          {Object.entries(headers).map(([key, value]) => (
            <tr key={key}>
              <th>{toUpperTokenHead(key)}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Body({
  bodyRaw,
  bodyJson,
}: { bodyRaw?: string; bodyJson?: JsonBody }) {
  if (bodyJson != null) {
    return (
      <div className="body">
        <pre>{JSON.stringify(bodyJson, null, 2)} </pre>
      </div>
    );
  }

  if (bodyRaw != null) {
    return (
      <div className="body">
        <pre>{bodyRaw}</pre>
      </div>
    );
  }

  return <></>;
}

function RequestRecordView({
  record,
  ...props
}: React.ComponentProps<'div'> & { record: RequestRecord }) {
  return (
    <div className="requestRecord" {...props}>
      <h3 className="request">
        {record.request.method} {record.request.pathQuery}
      </h3>
      <div className="timestamp">{record.timestamp}</div>
      <Headers headers={record.request.headers} />
      <Body {...record.request} />
    </div>
  );
}

function Bucket() {
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
    <div>
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
        <RequestRecordView
          key={record.id}
          id={record.id}
          data-osid={record._id}
          record={record}
        />
      ))}
    </div>
  );
}

export default Bucket;
