import { BrowserRouter, Link, Route, Routes } from 'react-router';
import Bucket from './Bucket';
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
    <main className="container">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Top />} />
          <Route path="/bucket/:bucket" element={<Bucket />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </main>
  );
}

export default App;
