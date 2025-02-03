import type { FastifyPluginAsync } from 'fastify';
import path from 'node:path';
import { type SpaghettiConfig, invoke } from './engine';
import { spaStaticHandlerPlugin } from './spaStatic';

type ProdServerPluginOptions = {
  publicDir: string;
};

const prodServerPlugin: FastifyPluginAsync<ProdServerPluginOptions> = async (
  fastify,
  { publicDir },
) => {
  await fastify.register(spaStaticHandlerPlugin, {
    root: publicDir,
  });
};

(prodServerPlugin as unknown as { [key: symbol]: boolean })[
  Symbol.for('skip-override')
] = true;

export const prodServer = async ({
  main,
  port,
  publicDir: configPublicDir,
  distDir,
}: SpaghettiConfig & { distDir?: string }) => {
  const cwd = process.cwd();

  const publicDir = path.join(
    cwd,
    distDir ?? 'dist',
    configPublicDir ?? 'public',
  );

  await invoke({
    main,
    port,
    publicDir,
    registerPlugins: async (server, publicDir) => {
      server.register(prodServerPlugin, { publicDir });
    },
  });
};
