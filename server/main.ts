import { Client } from '@opensearch-project/opensearch';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import FastifyRawBody from 'fastify-raw-body';
import buffer from 'node:buffer';
import type { JsonBody, RequestRecord } from '../common/types';
import type { SpaghettiMain } from '../lib/spaghetti/engine';
import type { RouteHandlerMethodWithCustomRouteGeneric } from './util';
import { uuid62 } from './uuid62';

const envValue = (key: string): string => {
  const value = process.env[key];
  if (value == null) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value;
};

const OPENSEARCH_INDEX = envValue('OPENSEARCH_INDEX');

const IGNORE_HEADER_PREFIX = (process.env.IGNORE_HEADER_PREFIX ?? '')
  .split(/\s*,\s*/)
  .filter((prefix) => prefix !== '')
  .map((prefix) => prefix.toLowerCase());

const createOpenSearchClient = () => {
  const username = process.env.OPENSEARCH_USERNAME;
  const password = process.env.OPENSEARCH_PASSWORD;

  if (username != null) {
    if (password == null) {
      throw new Error(
        'OPENSEARCH_USERNAME is set but OPENSEARCH_PASSWORD is not set',
      );
    }
  }
  if (password != null) {
    if (username == null) {
      throw new Error(
        'OPENSEARCH_PASSWORD is set but OPENSEARCH_USERNAME is not set',
      );
    }
  }

  return new Client({
    ...{
      node: envValue('OPENSEARCH_ENDPOINT'),
    },
    ...(username != null && password != null
      ? {
          auth: {
            username,
            password,
          },
        }
      : {}),
  });
};

const openSearch = createOpenSearchClient();

const dateToISO8601String = (date: Date) =>
  `${date.toLocaleDateString('sv-SE')}T${date.toLocaleTimeString('sv-SE')}+0900`;

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
    } catch (e) {
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

  const res = await openSearch.index({
    index: OPENSEARCH_INDEX,
    body: record,
    refresh: true,
  });
  if (res.statusCode !== 201) {
    return reply.code(500).send({ ok: false });
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const effectiveProto = forwardedProto ?? protocol;

  const link = `${effectiveProto}://${req.headers.host}/bucket/${bucket}/${id}`;

  reply.code(200).send({ ok: true, link });
};

const filterHeaders = (item: RequestRecord): RequestRecord => {
  if (IGNORE_HEADER_PREFIX.length === 0) {
    return item;
  }

  const headers = Object.fromEntries(
    Object.entries(item.request.headers).filter(
      ([key]) => !IGNORE_HEADER_PREFIX.some((prefix) => key.startsWith(prefix)),
    ),
  );
  return { ...item, request: { ...item.request, headers } };
};

const onGetHookRecords: RouteHandlerMethodWithCustomRouteGeneric<{
  Params: { bucket: string };
  Querystring: { from?: string };
}> = async (req, reply) => {
  const { bucket } = req.params;
  const from = req.query.from ?? '0';

  const res = await openSearch.search({
    index: OPENSEARCH_INDEX,
    body: {
      from: Math.trunc(Number(from)),
      size: 10,
      query: {
        term: {
          bucket,
        },
      },
      sort: [
        {
          id: {
            order: 'desc',
          },
        },
      ],
    },
  });

  const records =
    res.statusCode === 200
      ? res.body.hits.hits
          .filter((hit) => hit._source != null)
          .map((hit) => ({ ...hit._source, _id: hit._id }))
          .map((record) => filterHeaders(record as RequestRecord))
      : [];
  return reply.code(200).send(records);
};

const onGetHookRecord: RouteHandlerMethodWithCustomRouteGeneric<{
  Params: { bucket: string; id: string };
}> = async (req, reply) => {
  const { bucket, id } = req.params;

  const res = await openSearch.search({
    index: OPENSEARCH_INDEX,
    body: {
      size: 1,
      query: {
        bool: {
          must: [
            {
              term: {
                bucket,
              },
            },
            {
              term: {
                id,
              },
            },
          ],
        },
      },
    },
  });

  const records =
    res.statusCode === 200
      ? res.body.hits.hits
          .filter((hit) => hit._source != null)
          .map((hit) => ({ ...hit._source, _id: hit._id }))
          .map((record) => filterHeaders(record as RequestRecord))
      : [];

  if (records.length === 0) {
    return reply.code(404).send({ message: 'Record not found' });
  }

  return reply.code(200).send(records[0]);
};

const setup = async (server: FastifyInstance) => {
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
