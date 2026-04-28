import { serve } from 'bun';
import { withLogging } from './middleware/logging';
import { createGetRecordHandler, createGetRecordsHandler } from './routes/api';
import { createHookHandler } from './routes/hook';
import { staticHandler } from './static';
import { createStorageFromEnv } from './storage';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT ?? 3000);

const storage = createStorageFromEnv();

const hookHandler = createHookHandler(storage);
const getRecords = createGetRecordsHandler(storage);
const getRecord = createGetRecordHandler(storage);

// In dev, Bun bundles client/index.html (and its <script> graph) on the fly
// with HMR and logs requests itself — withLogging is not applied.
// In prod, we serve the pre-built artifacts under dist/public/ with withLogging.
const spaRoute = dev
  ? (await import('../client/index.html')).default
  : withLogging(staticHandler);

const server = serve({
  port,
  routes: {
    '/api/bucket/:bucket/record/': withLogging(getRecords),
    '/api/bucket/:bucket/record/:id': withLogging(getRecord),
    '/hook/*': withLogging(hookHandler),
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
