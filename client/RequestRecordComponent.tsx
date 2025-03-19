import { forwardRef } from 'react';
import { Link } from 'react-router';
import type { JsonBody, RequestRecord } from '../common/types';

function toUpperTokenHead(src: string): string {
  return src
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function Headers({
  headers,
  ...props
}: React.ComponentProps<'div'> & { headers: Record<string, string> }) {
  return (
    <div className="headers" {...props}>
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
  ...props
}: React.ComponentProps<'div'> & { bodyRaw?: string; bodyJson?: JsonBody }) {
  if (bodyJson != null) {
    return (
      <div className="body" {...props}>
        <pre>{JSON.stringify(bodyJson, null, 2)} </pre>
      </div>
    );
  }

  if (bodyRaw != null) {
    return (
      <div className="body" {...props}>
        <pre>{bodyRaw}</pre>
      </div>
    );
  }

  return <></>;
}

const RequestRecordComponent = forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    record: RequestRecord;
    linkToItem?: string;
  }
>(({ record, linkToItem, ...props }, ref) => {
  const localTimestamp = new Date(record.timestamp).toLocaleString(undefined, { timeZoneName: 'short', });
  return (
    <div className="requestRecord" {...props} ref={ref}>
      <h3 className="request">
        {record.request.method} {record.request.pathQuery}
      </h3>
      <div className="timestamp">
        {linkToItem ? (
          <Link to={`/bucket/${record.bucket}/${record.id}`}>
            {localTimestamp}
          </Link>
        ) : (
          localTimestamp
        )}
      </div>
      <Headers headers={record.request.headers} />
      <Body
        bodyJson={record.request.bodyJson}
        bodyRaw={record.request.bodyRaw}
      />
    </div>
  );
});

export default RequestRecordComponent;
