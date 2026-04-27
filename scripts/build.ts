#!/usr/bin/env bun

const result = await Bun.build({
  entrypoints: ['./client/index.html'],
  outdir: './dist/public',
  publicPath: '/',
  sourcemap: 'external',
  target: 'browser',
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  env: 'BUN_PUBLIC_*',
});

if (!result.success) {
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}
