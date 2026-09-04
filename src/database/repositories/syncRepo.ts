import { executeSql, executeWrite, getDb } from '../db';
import { isPastDue, nowIso } from '../../utils/dates';

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

export const syncEntityConfig = {
  property: {
    collection: 'properties',
    columns: ['id', 'name', 'type', 'address', 'created_at', 'updated_at', 'owner_id', 'deleted_at', 'version'],
    table: 'properties',
  },
  unit: {
    collection: 'units',
    columns: ['id', 'property_id', 'name', 'monthly_rent', 'status', 'created_at', 'updated_at', 'owner_id', 'deleted_at', 'version'],
    table: 'units',
  },
  tenant: {
    collection: 'tenants',
    columns: ['id', 'unit_id', 'name', 'phone', 'monthly_rent', 'due_day', 'move_in_date', 'security_deposit', 'status', 'notes', 'created_at', 'updated_at', 'owner_id', 'deleted_at', 'version'],
    table: 'tenants',
  },
  rentCycle: {
    collection: 'rentCycles',
    columns: ['id', 'tenant_id', 'month', 'year', 'rent_amount', 'due_date', 'total_paid', 'balance', 'status', 'created_at', 'updated_at', 'owner_id', 'deleted_at', 'version'],
    table: 'rent_cycles',
  },
  payment: {
    collection: 'payments',
    columns: ['id', 'rent_cycle_id', 'tenant_id', 'amount', 'payment_date', 'payment_mode', 'reference_no', 'notes', 'created_at', 'updated_at', 'owner_id', 'deleted_at', 'version'],
    table: 'payments',
  },
} as const;

export type SyncEntityType = keyof typeof syncEntityConfig;

const profileKeys = ['currency', 'landlordName', 'landlordPhone', 'onboardingDone', 'cloudProfileUpdatedAt'] as const;

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

  async entity(entityType: SyncEntityType, entityId: string) {
    const config = syncEntityConfig[entityType];
    const rows = await executeSql<Record<string, unknown>>(
      `SELECT ${config.columns.join(', ')} FROM ${config.table} WHERE id = ?`,
      [entityId],
    );
    return rows[0] ?? null;
  },

  async applyRemoteEntity(entityType: SyncEntityType, data: Record<string, unknown>, ownerId: string) {
    const config = syncEntityConfig[entityType];
    const columns = config.columns;
    const values = columns.map(column => column === 'owner_id' ? ownerId : data[column] ?? null);
    const updates = columns
      .filter(column => column !== 'id')
      .map(column => `${column} = excluded.${column}`)
      .join(', ');
    const db = await getDb();

    await db.executeSql(
      `INSERT INTO ${config.table} (${columns.join(', ')}, sync_status)
       VALUES (${columns.map(() => '?').join(', ')}, 'synced')
       ON CONFLICT(id) DO UPDATE SET ${updates}, sync_status = 'synced'`,
      values,
    );
    await db.executeSql('DELETE FROM sync_queue WHERE entity_type = ? AND entity_id = ?', [entityType, data.id]);
  },

  async markSynced(item: SyncQueueItem, ownerId: string) {
    const config = syncEntityConfig[item.entity_type];
    const db = await getDb();
    await db.executeSql(
      `UPDATE ${config.table}
       SET sync_status = 'synced', owner_id = ?
       WHERE id = ? AND updated_at = ?`,
      [ownerId, item.entity_id, item.updated_at],
    );
    await db.executeSql(
      'DELETE FROM sync_queue WHERE id = ? AND updated_at = ?',
      [item.id, item.updated_at],
    );
  },

  async markFailed(item: SyncQueueItem, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const db = await getDb();
    await db.executeSql(
      `UPDATE sync_queue
       SET attempt_count = attempt_count + 1, last_error = ?
       WHERE id = ?`,
      [message.slice(0, 500), item.id],
    );
    const config = syncEntityConfig[item.entity_type];
    await db.executeSql(
      `UPDATE ${config.table} SET sync_status = 'failed' WHERE id = ?`,
      [item.entity_id],
    );
  },

  async profile() {
    const placeholders = profileKeys.map(() => '?').join(', ');
    const rows = await executeSql<{ key: typeof profileKeys[number]; value: string }>(
      `SELECT key, value FROM settings WHERE key IN (${placeholders})`,
      [...profileKeys],
    );
    return rows.reduce<Record<string, string>>((profile, row) => {
      profile[row.key] = row.value;
      return profile;
    }, {});
  },

  async applyRemoteProfile(profile: Record<string, unknown>) {
    const db = await getDb();
    for (const key of profileKeys) {
      const value = profile[key];
      if (typeof value === 'string') {
        await db.executeSql(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, value],
        );
      }
    }
  },

  async reconcileRentCycles() {
    const cycles = await executeSql<{
      balance: number;
      due_date: string;
      id: string;
      rent_amount: number;
      status: string;
      stored_total: number;
      payment_total: number;
    }>(`
      SELECT rc.id, rc.rent_amount, rc.balance, rc.due_date, rc.status,
             rc.total_paid AS stored_total, COALESCE(SUM(p.amount), 0) AS payment_total
      FROM rent_cycles rc
      LEFT JOIN payments p ON p.rent_cycle_id = rc.id AND p.deleted_at IS NULL
      WHERE rc.deleted_at IS NULL
      GROUP BY rc.id
    `);
    const db = await getDb();
    let changed = false;

    for (const cycle of cycles) {
      const totalPaid = Number(cycle.payment_total);
      const balance = Number(cycle.rent_amount) - totalPaid;
      const status = balance <= 0
        ? 'paid'
        : totalPaid > 0
          ? 'partial'
          : isPastDue(cycle.due_date)
            ? 'overdue'
            : 'unpaid';

      if (Number(cycle.stored_total) !== totalPaid || Number(cycle.balance) !== balance || cycle.status !== status) {
        await db.executeSql(
          `UPDATE rent_cycles
           SET total_paid = ?, balance = ?, status = ?, updated_at = ?,
               sync_status = 'pending', version = version + 1
           WHERE id = ?`,
          [totalPaid, balance, status, nowIso(), cycle.id],
        );
        changed = true;
      }
    }

    return changed;
  },
};
