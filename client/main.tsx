import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App.tsx';
import './style.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('No root element found');
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Persist the React root across hot reloads so component state is preserved.
// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
declare global {
  interface ImportMetaHotData {
    root?: Root;
  }
}

if (import.meta.hot) {
  import.meta.hot.data.root ??= createRoot(root);
  import.meta.hot.data.root.render(app);
} else {
  createRoot(root).render(app);
}
