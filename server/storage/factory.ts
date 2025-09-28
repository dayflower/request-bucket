import type { StorageAdapter } from './interface';
import { MemoryStorageAdapter } from './memory';
import { OpenSearchStorageAdapter } from './opensearch';

export type StorageType = 'opensearch' | 'memory';

export interface StorageConfig {
  type: StorageType;
  opensearch?: {
    endpoint: string;
    index: string;
    username?: string;
    password?: string;
  };
  ignoreHeaderPrefixes?: string[];
}

export function createStorage(config: StorageConfig): StorageAdapter {
  const ignoreHeaderPrefixes = config.ignoreHeaderPrefixes || [];

  switch (config.type) {
    case 'opensearch': {
      if (!config.opensearch) {
        throw new Error('OpenSearch configuration is required for opensearch storage type');
      }

      const { endpoint, index, username, password } = config.opensearch;
      const auth = username && password ? { username, password } : undefined;

      return new OpenSearchStorageAdapter(
        endpoint,
        index,
        auth,
        ignoreHeaderPrefixes
      );
    }

    case 'memory': {
      return new MemoryStorageAdapter(ignoreHeaderPrefixes);
    }

    default: {
      throw new Error(`Unsupported storage type: '${config.type}'. Supported types are: opensearch, memory`);
    }
  }
}

export function createStorageFromEnv(): StorageAdapter {
  const storageType = (process.env.STORAGE_TYPE || 'memory') as StorageType;

  const ignoreHeaderPrefixes = (process.env.IGNORE_HEADER_PREFIX ?? '')
    .split(/\s*,\s*/)
    .filter((prefix) => prefix !== '')
    .map((prefix) => prefix.toLowerCase());

  const config: StorageConfig = {
    type: storageType,
    ignoreHeaderPrefixes,
  };

  if (storageType === 'opensearch') {
    const endpoint = process.env.OPENSEARCH_ENDPOINT;
    const index = process.env.OPENSEARCH_INDEX;

    if (!endpoint || !index) {
      throw new Error(
        'OPENSEARCH_ENDPOINT and OPENSEARCH_INDEX are required for OpenSearch storage'
      );
    }

    const username = process.env.OPENSEARCH_USERNAME;
    const password = process.env.OPENSEARCH_PASSWORD;

    if (username && !password) {
      throw new Error(
        'OPENSEARCH_USERNAME is set but OPENSEARCH_PASSWORD is not set'
      );
    }
    if (password && !username) {
      throw new Error(
        'OPENSEARCH_PASSWORD is set but OPENSEARCH_USERNAME is not set'
      );
    }

    config.opensearch = {
      endpoint,
      index,
      username,
      password,
    };
  }

  return createStorage(config);
}