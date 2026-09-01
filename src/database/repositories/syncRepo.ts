import { executeSql, executeWrite } from '../db';

export type SyncQueueItem = {
  id: string;
  entity_type: 'property' | 'unit' | 'tenant' | 'rentCycle' | 'payment';
  entity_id: string;
  operation: 'upsert' | 'delete';
  attempt_count: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

export const syncRepo = {
  pending() {
    return executeSql<SyncQueueItem>('SELECT * FROM sync_queue ORDER BY updated_at ASC');
  },

  async pendingCount() {
    const rows = await executeSql<{ count: number }>('SELECT COUNT(*) AS count FROM sync_queue');
    return rows[0]?.count ?? 0;
  },

  localOwner() {
    return executeSql<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['firebaseUserId'])
      .then(rows => rows[0]?.value ?? null);
  },

  async claimLocalData(ownerId: string) {
    await executeWrite('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['firebaseUserId', ownerId]);
    for (const table of ['properties', 'units', 'tenants', 'rent_cycles', 'payments']) {
      await executeWrite(`UPDATE ${table} SET owner_id = ? WHERE owner_id IS NULL`, [ownerId]);
    }
  },
};
