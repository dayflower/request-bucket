import type { ReactNode } from 'react';

function RecordingGuide({
  children,
  bucketId = 'sandbox',
  ...props
}: React.ComponentProps<'div'> & { children?: ReactNode; bucketId?: string }) {
  return (
    <article {...props}>
      {children}

      <p>
        To record a webhook, send a request to <code>/hook/{bucketId}</code>.
      </p>

      <p>For example:</p>

      <pre>
        curl \<br />
        &nbsp;&nbsp;&nbsp;&nbsp;-X POST \<br />
        &nbsp;&nbsp;&nbsp;&nbsp;-H 'Content-Type: application/json' \<br />
        &nbsp;&nbsp;&nbsp;&nbsp;-d '{'{'} "message": "Hello, world" {'}'}' \
        <br />
        &nbsp;&nbsp;&nbsp;&nbsp;/hook/{bucketId}/some/optional/path
      </pre>

      <p>You can use any HTTP method, such as GET, POST, PUT, or DELETE ...</p>

      <p>
        Any additional paths in the request URL will still be recorded under the
        same bucket.
      </p>

      <p>
        For example, if you send a request to
        <code>/hook/{bucketId}/foo/bar</code>, it will still be recorded in the
        bucket <code>{bucketId}</code>.
      </p>
    </article>
  );
}

export default RecordingGuide;
