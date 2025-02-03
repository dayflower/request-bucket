import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './client',
  publicDir: '../public',
  base: '/',
  build: {
    outDir: '../dist/public',
  },
});
