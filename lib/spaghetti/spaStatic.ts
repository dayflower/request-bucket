import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import send, { type SendOptions } from '@fastify/send';
import { type Dirent, statSync } from 'node:fs';
import path from 'node:path';

(send.mime as unknown as { default_type: string }).default_type =
  'application/octet-stream';

type SpaStaticHandlerOptions = SendOptions & {
  root: string; // mandatory
  spaFallback?: string;
  spaNotFoundForFilesWithExtension?: boolean;
  allowedPath?: (
    pathname: string,
    root: string,
    req: FastifyRequest,
  ) => boolean;
  setHeaders?: (
    response: FastifyReply['raw'],
    path: string,
    stat: Dirent,
  ) => void;
};

export const spaStaticHandlerPlugin: FastifyPluginAsync<
  SpaStaticHandlerOptions
> = async (fastify, options) => {
  fastify.setNotFoundHandler(async (req, reply) => {
    await pumpSend(req, reply, req.url, options);
  });
};

// the main logic is borrowed from https://github.com/fastify/fastify-static/blob/master/index.js
async function pumpSend(
  req: FastifyRequest,
  reply: FastifyReply,
  pathname: string,
  options: SpaStaticHandlerOptions,
) {
  const defaultIndexFile =
    typeof options.index === 'string' ? options.index : 'index.html';

  const {
    spaFallback = `/${defaultIndexFile}`,
    spaNotFoundForFilesWithExtension = false,
    allowedPath,
    setHeaders,
    ...sendOptions
  } = options;

  if (allowedPath && !allowedPath(pathname, options.root, req)) {
    return reply.callNotFound();
  }

  const { statusCode, headers, stream, type, metadata } = await send(
    req.raw,
    encodeURI(pathname),
    sendOptions,
  );

  switch (type) {
    case 'directory': {
      // if is a directory path without a trailing slash, and has an index file, reply as if it has a trailing slash
      if (
        !pathname.endsWith('/') &&
        findIndexFile(pathname, options.root, options.index)
      ) {
        return pumpSend(req, reply, `${pathname}/`, options);
      }

      break;
    }

    case 'error': {
      if ((metadata.error as { code?: string }).code === 'ENOENT') {
        if (
          spaNotFoundForFilesWithExtension &&
          pathname.split('/').pop()?.includes('.')
        ) {
          return reply.callNotFound();
        }

        if (pathname !== spaFallback) {
          return pumpSend(req, reply, spaFallback, options);
        }

        return reply.callNotFound();
      }

      // The `send` library terminates the request with a 404 if the requested
      // path contains a dotfile and `send` is initialized with `{dotfiles:
      // 'ignore'}`. `send` aborts the request before getting far enough to
      // check if the file exists (hence, a 404 `NotFoundError` instead of
      // `ENOENT`).
      // https://github.com/pillarjs/send/blob/de073ed3237ade9ff71c61673a34474b30e5d45b/index.js#L582
      if ((metadata.error as { status?: number }).status === 404) {
        return reply.callNotFound();
      }

      await reply.send(metadata.error);

      break;
    }

    case 'file': {
      // reply.raw.statusCode by default 200
      // when ever the user changed it, we respect the status code
      // otherwise use send provided status code
      const newStatusCode =
        reply.statusCode !== 200 ? reply.statusCode : statusCode;
      reply.code(newStatusCode);

      if (setHeaders !== undefined) {
        setHeaders(reply.raw, metadata.path, metadata.stat);
      }
      reply.headers(headers);

      await reply.send(stream);

      break;
    }
  }
}

function findIndexFile(
  pathname: string,
  root: string,
  indexFiles: undefined | boolean | string | string[] = ['index.html'],
) {
  if (typeof indexFiles === 'string') {
    return findIndexFile(pathname, root, [indexFiles]);
  }

  if (Array.isArray(indexFiles)) {
    return indexFiles.find((filename) => {
      const p = path.join(root, pathname, filename);
      try {
        const stats = statSync(p);
        return !stats.isDirectory();
      } catch {
        return false;
      }
    });
  }
  /* c8 ignore next */
  return false;
}
