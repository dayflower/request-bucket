export function withLogging<T extends Request>(
  handler: (req: T) => Promise<Response>,
): (req: T) => Promise<Response> {
  return async (req: T): Promise<Response> => {
    const start = performance.now();
    const response = await handler(req);
    const elapsed = (performance.now() - start).toFixed(0);
    const url = new URL(req.url);
    const path = url.pathname + url.search;
    const ts = new Date().toISOString();
    console.log(
      `[${ts}] ${req.method} ${path} ${response.status} ${elapsed}ms`,
    );
    return response;
  };
}
