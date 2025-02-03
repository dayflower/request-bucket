export type JsonBody =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export type RequestRecord = {
  id?: string;
  _id?: string;
  timestamp: string;
  bucket: string;
  request: {
    method: string;
    protocol: string;
    host: string;
    port: number;
    pathQuery: string;
    path: string;
    args: string;
    queryString: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    bodyRaw?: string;
    bodyJson?: JsonBody;
  };
};
