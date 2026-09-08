export class SyncCancelled extends Error {}

export type SyncSession = {
  ownerId: string;
  isActive: () => boolean;
  run: <T>(operation: () => Promise<T>) => Promise<T>;
};

export function createSyncSession(ownerId: string, isActive: () => boolean): SyncSession {
  return {
    ownerId,
    isActive,
    async run(operation) {
      if (!isActive()) throw new SyncCancelled();
      const result = await operation();
      if (!isActive()) throw new SyncCancelled();
      return result;
    },
  };
}
