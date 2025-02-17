import { Link } from 'react-router';
import RecordingGuide from './RecordingGuide';

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

      <RecordingGuide>
        <h3>Recording requests</h3>
      </RecordingGuide>

      <article>
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
      </article>
    </div>
  );
}

export default Top;
