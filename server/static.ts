import { resolve } from 'node:path';

const PUBLIC_DIR = resolve(process.cwd(), 'dist/public');
const INDEX_HTML = resolve(PUBLIC_DIR, 'index.html');

const isSafePath = (target: string): boolean => {
  return target === PUBLIC_DIR || target.startsWith(`${PUBLIC_DIR}/`);
};

export const staticHandler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;

  const target = resolve(PUBLIC_DIR, `.${pathname}`);

  if (isSafePath(target)) {
    const file = Bun.file(target);
    if (await file.exists()) {
      return new Response(file);
    }
  }

  // SPA fallback: serve index.html for unknown routes so the client
  // router can handle them.
  const fallback = Bun.file(INDEX_HTML);
  if (await fallback.exists()) {
    return new Response(fallback, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return new Response('Not Found', { status: 404 });
};
