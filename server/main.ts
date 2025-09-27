import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import FastifyRawBody from 'fastify-raw-body';
import buffer from 'node:buffer';
import type { JsonBody, RequestRecord } from '../common/types';
import type { SpaghettiMain } from '../lib/spaghetti/engine';
import { createStorageFromEnv } from './storage/factory';
import type { StorageAdapter } from './storage/interface';
import type { RouteHandlerMethodWithCustomRouteGeneric } from './util';
import { uuid62 } from './uuid62';

const ITEMS_PER_PAGE = 5;

let storage: StorageAdapter;

const parseRequestBody = (
  rawBody: Buffer | undefined,
  contentType: string | undefined,
) => {
  if (!rawBody) {
    return {};
  }

  if (!buffer.isUtf8(rawBody)) {
    return {};
  }

  const bodyRaw = rawBody.toString('utf-8');

  if (contentType === 'application/json') {
    try {
      return {
        bodyRaw,
        bodyJson: JSON.parse(bodyRaw) as JsonBody,
      };
    } catch (_e) {
      return { bodyRaw };
    }
  } else {
    return { bodyRaw };
  }
};

const onHookHandler: RouteHandlerMethod = async (req, reply) => {
  const { url: pathQuery, port, hostname: host, protocol } = req;

  const url = new URL(`http://dummy.example.com${pathQuery}`);

  const { pathname: path, search: queryString } = url;

  const paths = path.split('/').slice(2); // heading '/' and 'hook' are removed

  const bucket = paths[0];

  if (bucket == null || bucket === '') {
    reply.callNotFound();
    return;
  }

  const contentType = req.headers['content-type']
    ?.toLowerCase()
    ?.split(';')?.[0];

  const body = req.rawBody as Buffer | undefined;

  const id = uuid62();

  const record: RequestRecord = {
    id,
    timestamp: new Date().toISOString(),
    bucket: paths[0],
    request: {
      method: req.method,
      protocol,
      host,
      port,
      pathQuery,
      path,
      args: ['', ...paths.slice(1)].join('/'),
      queryString,
      query: req.query == null ? {} : { ...req.query },
      headers: { ...req.headers } as Record<string, string>,
      ...parseRequestBody(body, contentType),
    },
  };

  try {
    await storage.store(record);
  } catch (error) {
    console.error('Failed to store record:', error);
    return reply.code(500).send({ ok: false });
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const effectiveProto = forwardedProto ?? protocol;

  const link = `${effectiveProto}://${req.headers.host}/bucket/${bucket}/${id}`;

  reply.code(200).send({ ok: true, link });
};

const onGetHookRecords: RouteHandlerMethodWithCustomRouteGeneric<{
  Params: { bucket: string };
  Querystring: { from?: string };
}> = async (req, reply) => {
  const { bucket } = req.params;
  const from = req.query.from;

  try {
    const result = await storage.getRecords(bucket, {
      from,
      limit: ITEMS_PER_PAGE,
    });

    return reply.code(200).send(result);
  } catch (error) {
    console.error('Failed to get records:', error);
    return reply.code(200).send({ records: [] });
  }
};

const onGetHookRecord: RouteHandlerMethodWithCustomRouteGeneric<{
  Params: { bucket: string; id: string };
}> = async (req, reply) => {
  const { bucket, id } = req.params;

  try {
    const record = await storage.getRecord(bucket, id);

    if (!record) {
      return reply.code(404).send({ message: 'Record not found' });
    }

    return reply.code(200).send(record);
  } catch (error) {
    console.error('Failed to get record:', error);
    return reply.code(404).send({ message: 'Record not found' });
  }
};

const setup = async (server: FastifyInstance) => {
  // Initialize storage from environment variables
  storage = createStorageFromEnv();

  await server.register(FastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: false,
  });

  server
    .route({
      method: ['GET', 'HEAD', 'DELETE', 'PATCH', 'POST', 'PUT'],
      url: '/hook/*',
      config: {
        rawBody: true,
      },
      handler: onHookHandler,
    })
    .get<{ Params: { bucket: string }; Querystring: { from?: string } }>(
      '/api/bucket/:bucket/record/',
      onGetHookRecords,
    )
    .get<{ Params: { bucket: string; id: string } }>(
      '/api/bucket/:bucket/record/:id',
      onGetHookRecord,
    );
};

export default {
  setup,
} satisfies SpaghettiMain;