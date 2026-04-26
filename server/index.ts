import { serve } from 'bun';
import { createGetRecordHandler, createGetRecordsHandler } from './routes/api';
import { createHookHandler } from './routes/hook';
import { staticHandler } from './static';
import { createStorageFromEnv } from './storage/factory';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT ?? 3000);

const storage = createStorageFromEnv();

const hookHandler = createHookHandler(storage);
const getRecords = createGetRecordsHandler(storage);
const getRecord = createGetRecordHandler(storage);

// In dev, Bun bundles client/index.html (and its <script> graph) on the fly
// with HMR. In prod, we serve the pre-built artifacts under dist/public/.
const spaRoute = dev
  ? (await import('../client/index.html')).default
  : staticHandler;

const server = serve({
  port,
  routes: {
    '/api/bucket/:bucket/record/': getRecords,
    '/api/bucket/:bucket/record/:id': getRecord,
    '/hook/*': hookHandler,
    '/*': spaRoute,
  },
  development: dev && { hmr: true, console: true },
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down`);
  server.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`request-bucket listening on ${server.url}`);
