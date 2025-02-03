import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync } from 'fastify';
import path from 'node:path';
import type { ParsedUrlQuery } from 'node:querystring';
import { createServer } from 'vite';
import { type SpaghettiConfig, invoke } from './engine';

type DevServerPluginOptions = {
  publicDir: string;
};

const devServerPlugin: FastifyPluginAsync<DevServerPluginOptions> = async (
  fastify,
  { publicDir },
) => {
  await fastify.register(fastifyStatic, {
    root: publicDir,
    allowedPath: (_path, _root, req) => {
      if (req.method !== 'GET') {
        return true;
      }

      // this hack is not good in case that server handles '?import' as a query paramter, but somehow reasonable
      const query = req.query as ParsedUrlQuery;
      if (query != null && query.import != null && query.import.length === 0) {
        // static resource import in development
        return false;
      }

      return true;
    },
  });

  const frontend = await createServer({
    server: {
      middlewareMode: true,
    },
    appType: 'spa',
    clearScreen: false,
  });

  fastify.setNotFoundHandler((req, reply) => {
    frontend.middlewares.handle(req.raw, reply.raw, () => {});
  });
};

(devServerPlugin as unknown as { [key: symbol]: boolean })[
  Symbol.for('skip-override')
] = true;

export const devServer = async ({
  main,
  port,
  publicDir: configPublicDir,
}: SpaghettiConfig) => {
  const cwd = process.cwd();

  const publicDir = path.join(cwd, configPublicDir ?? './public');

  await invoke({
    main,
    publicDir,
    port,
    registerPlugins: async (server, publicDir) => {
      server.register(devServerPlugin, { publicDir });
      console.log('registered');
    },
  });
};
