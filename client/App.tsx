import { BrowserRouter, Link, Route, Routes } from 'react-router';
import Bucket from './Bucket';
import RequestRecordView from './RequestRecordView';
import Top from './Top';

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
            href={`https://github.com/dayflower/request-bucket/releases/tag/v${__APP_VERSION__}`}
            target="_blank"
            rel="noreferrer"
          >
            v{__APP_VERSION__}
          </a>{' '}
          (
          <a
            href={`https://github.com/dayflower/request-bucket/commit/${__GIT_COMMIT__}`}
            target="_blank"
            rel="noreferrer"
          >
            {__GIT_COMMIT__.slice(0, 7)}
          </a>
          )
        </small>
      </footer>
    </>
  );
}

export default App;
