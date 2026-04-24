export {
  createStorage,
  createStorageFromEnv,
  type StorageConfig,
  type StorageType,
} from './factory';
export type { StorageAdapter } from './interface';
export { MemoryStorageAdapter } from './memory';
export { OpenSearchStorageAdapter } from './opensearch';
