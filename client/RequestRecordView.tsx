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

  const load = useCallback(async () => {
    if (bucket == null || recordId == null) {
      return;
    }

    try {
      const res = await fetch(`/api/bucket/${bucket}/record/${recordId}`, {
        method: 'GET',
      });
      if (res.ok) {
        const record = await res.json();
        setRecord(record);
      }
    } catch (err) {
      console.error(err);
    }
  }, [bucket, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div {...props}>
      <h1>
        <Link to="/">request bucket</Link>:{' '}
        <Link to={`/bucket/${bucket}`}>{bucket}</Link>
      </h1>

      <h2>Request</h2>

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
