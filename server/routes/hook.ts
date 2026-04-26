import { Buffer, isUtf8 } from 'node:buffer';
import type { JsonBody, RequestRecord } from '../../common/types';
import type { StorageAdapter } from '../storage/interface';
import { uuid58 } from '../uuid58';

const parseRequestBody = (
  rawBody: Buffer,
  contentType: string | undefined,
): { bodyRaw?: string; bodyJson?: JsonBody } => {
  if (rawBody.length === 0) {
    return {};
  }

  if (!isUtf8(rawBody)) {
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
  }

  return { bodyRaw };
};

const parseHostHeader = (
  hostHeader: string | null,
  fallbackHost: string,
  fallbackPort: number,
): { host: string; port: number } => {
  if (!hostHeader) {
    return { host: fallbackHost, port: fallbackPort };
  }
  const colonIdx = hostHeader.lastIndexOf(':');
  if (colonIdx < 0) {
    return { host: hostHeader, port: fallbackPort };
  }
  const host = hostHeader.slice(0, colonIdx);
  const port = Number(hostHeader.slice(colonIdx + 1));
  return {
    host,
    port: Number.isFinite(port) ? port : fallbackPort,
  };
};

export const createHookHandler = (storage: StorageAdapter) => {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const pathQuery = url.pathname + url.search;
    const path = url.pathname;
    const queryString = url.search;

    const protocol = url.protocol.replace(':', '');

    const paths = path.split('/').slice(2); // strip leading '' and 'hook'
    const bucket = paths[0];

    if (bucket == null || bucket === '') {
      return new Response('Not Found', { status: 404 });
    }

    const fallbackPort = protocol === 'https' ? 443 : 80;
    const { host, port } = parseHostHeader(
      req.headers.get('host'),
      url.hostname,
      url.port ? Number(url.port) : fallbackPort,
    );

    const contentType = req.headers
      .get('content-type')
      ?.toLowerCase()
      ?.split(';')?.[0];

    const rawBody = Buffer.from(await req.arrayBuffer());

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const id = uuid58();

    const record: RequestRecord = {
      id,
      timestamp: new Date().toISOString(),
      bucket,
      request: {
        method: req.method,
        protocol,
        host,
        port,
        pathQuery,
        path,
        args: ['', ...paths.slice(1)].join('/'),
        queryString,
        query: Object.fromEntries(url.searchParams),
        headers,
        ...parseRequestBody(rawBody, contentType),
      },
    };

    try {
      await storage.store(record);
    } catch (error) {
      console.error('Failed to store record:', error);
      return Response.json({ ok: false }, { status: 500 });
    }

    const forwardedProto = req.headers.get('x-forwarded-proto');
    const effectiveProto = forwardedProto ?? protocol;
    const linkHost = req.headers.get('host') ?? `${host}:${port}`;
    const link = `${effectiveProto}://${linkHost}/bucket/${bucket}/${id}`;

    return Response.json({ ok: true, link });
  };
};
