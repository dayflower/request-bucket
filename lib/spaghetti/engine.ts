import fastify, { type FastifyInstance } from 'fastify';
import fastifyGracefulShutdown from 'fastify-graceful-shutdown';

const initFastify = () => {
  return fastify({ logger: true });
};

export type SpaghettiMain<T extends FastifyInstance = FastifyInstance> = {
  setup?: (server: T) => Promise<void> | void;
};

export type SpaghettiConfig = {
  main: SpaghettiMain;
  port?: number;
  publicDir?: string;
};

export const invoke = async ({
  main,
  publicDir,
  port = 3000,
  registerPlugins,
}: {
  main: SpaghettiMain;
  publicDir: string;
  port?: number;
  registerPlugins: (
    server: FastifyInstance,
    publicDir: string,
  ) => Promise<void>;
}) => {
  const server = initFastify();

  await server.register(fastifyGracefulShutdown);
  await registerPlugins(server, publicDir);

  server.after(() => {
    server.gracefulShutdown((signal) => {
      server.log.info(`Received signal: ${signal}`);
    });
  });

  if (main.setup) {
    const res = main.setup(server);
    if (res instanceof Promise) {
      await res;
    }
  }

  try {
    await server.listen({ host: '0.0.0.0', port });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
