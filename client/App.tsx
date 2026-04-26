import { BrowserRouter, Link, Route, Routes } from 'react-router';
import Bucket from './Bucket';
import RequestRecordView from './RequestRecordView';
import Top from './Top';

const APP_VERSION = process.env.BUN_PUBLIC_APP_VERSION ?? 'unknown';
const GIT_COMMIT = process.env.BUN_PUBLIC_GIT_COMMIT ?? 'unknown';

function NotFound() {
  return (
    <div>
      <h1>
        <Link to="/">request bucket</Link>
      </h1>
      <h2>Not Found</h2>
    </div>
  );
}

function App() {
  return (
    <>
      <main className="container">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Top />} />
            <Route path="/bucket/:bucket" element={<Bucket />} />
            <Route
              path="/bucket/:bucket/:recordId"
              element={<RequestRecordView />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </main>
      <footer className="container app-footer">
        <small>
          request-bucket{' '}
          <a
            href={`https://github.com/dayflower/request-bucket/releases/tag/v${APP_VERSION}`}
            target="_blank"
            rel="noreferrer"
          >
            v{APP_VERSION}
          </a>{' '}
          (
          <a
            href={`https://github.com/dayflower/request-bucket/commit/${GIT_COMMIT}`}
            target="_blank"
            rel="noreferrer"
          >
            {GIT_COMMIT.slice(0, 7)}
          </a>
          )
        </small>
      </footer>
    </>
  );
}

export default App;
