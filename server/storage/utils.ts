import type { RequestRecord } from '../../common/types';

export function filterHeaders(
  item: RequestRecord,
  ignoreHeaderPrefixes: string[],
): RequestRecord {
  if (ignoreHeaderPrefixes.length === 0) {
    return item;
  }

  const headers = Object.fromEntries(
    Object.entries(item.request.headers).filter(
      ([key]) => !ignoreHeaderPrefixes.some((prefix) => key.startsWith(prefix)),
    ),
  );

  return { ...item, request: { ...item.request, headers } };
}
