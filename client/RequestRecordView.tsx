import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { RequestRecord } from '../common/types';
import RequestRecordComponent from './RequestRecordComponent';

function RequestRecordView({ ...props }: React.ComponentProps<'div'>) {
  const { bucket, recordId } = useParams<{
    bucket: string;
    recordId: string;
  }>();
  const [record, setRecord] = useState<RequestRecord>();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (bucket == null || recordId == null) {
      return;
    }

    try {
      const res = await fetch(`/api/bucket/${bucket}/record/${recordId}`, {
        method: 'GET',
      });
      if (res.ok) {
        setError(null);
        const record = await res.json();
        setRecord(record);
      } else if (res.status === 404) {
        setError('Record not found.');
      } else {
        setError('Failed to load record from storage.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load record from storage.');
    }
  }, [bucket, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (bucket) {
      const timestamp = record
        ? new Date(record.timestamp).toLocaleString()
        : null;
      document.title = timestamp
        ? `request-bucket: ${bucket}: ${timestamp}`
        : `request-bucket: ${bucket}`;
    }
    return () => {
      document.title = 'request-bucket';
    };
  }, [bucket, record]);

  return (
    <div {...props}>
      <h1>
        <Link to="/">request bucket</Link>:{' '}
        <Link to={`/bucket/${bucket}`}>{bucket}</Link>
      </h1>

      <h2>Request</h2>

      {error && <p className="error-message">{error}</p>}

      {record && (
        <RequestRecordComponent
          key={record.id}
          id={record.id}
          data-osid={record._id}
          record={record}
        />
      )}
    </div>
  );
}

export default RequestRecordView;
