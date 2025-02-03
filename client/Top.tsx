import { Link } from 'react-router';

function Top() {
  return (
    <div>
      <h1>
        <Link to="/">request bucket</Link>
      </h1>

      <p>
        This is a simple tool to capture and display HTTP requests. It is useful
        for debugging and testing purposes.
      </p>

      <h2>Usage</h2>

      <h3>Recording requests</h3>

      <p>
        To record a webhook, send a request to <code>/hook/:bucket</code>.
      </p>
      <p>For example:</p>

      <pre>
        curl -X POST -d '{'{'}"hello": "world"{'}'}' /hook/mybucket
      </pre>

      <p>You can use any HTTP method, such as GET, POST, PUT, or DELETE ...</p>

      <p>
        Any additional paths in the request URL will still be recorded under the
        same bucket.
      </p>

      <p>
        For example, if you send a request to
        <code>/hook/mybucket/foo/bar</code>, it will still be recorded in the
        bucket <code>mybucket</code>.
      </p>

      <h3>Check requests</h3>

      <p>
        You can see requests in the bucket at <code>/bucket/:bucket</code>.
      </p>

      <p>
        Example:{' '}
        <Link to="/bucket/sandbox">
          <code>/bucket/sandbox</code>
        </Link>
      </p>
    </div>
  );
}

export default Top;
