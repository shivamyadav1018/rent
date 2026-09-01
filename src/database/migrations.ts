const syncColumns = [
  ['owner_id', 'TEXT'],
  ['deleted_at', 'TEXT'],
  ["sync_status", "TEXT NOT NULL DEFAULT 'pending'"],
  ['version', 'INTEGER NOT NULL DEFAULT 1'],
] as const;

const tableHasColumn = async (db: any, table: string, column: string) => {
  const [result] = await db.executeSql(`PRAGMA table_info(${table})`);
  for (let index = 0; index < result.rows.length; index += 1) {
    if (result.rows.item(index).name === column) {
      return true;
    }
  }
  return false;
};

const addColumnIfMissing = async (db: any, table: string, column: string, definition: string) => {
  if (!(await tableHasColumn(db, table, column))) {
    await db.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const createSyncTriggers = async (db: any, table: string, entityType: string) => {
  await db.executeSql(`
    CREATE TRIGGER IF NOT EXISTS ${table}_set_owner_after_insert
    AFTER INSERT ON ${table}
    WHEN NEW.owner_id IS NULL
    BEGIN
      UPDATE ${table}
      SET owner_id = (SELECT value FROM settings WHERE key = 'firebaseUserId')
      WHERE id = NEW.id;
    END;
  `);

  await db.executeSql(`
    CREATE TRIGGER IF NOT EXISTS ${table}_queue_after_insert
    AFTER INSERT ON ${table}
    BEGIN
      INSERT OR REPLACE INTO sync_queue
        (id, entity_type, entity_id, operation, attempt_count, last_error, created_at, updated_at)
      VALUES
        ('${entityType}_' || NEW.id, '${entityType}', NEW.id, 'upsert', 0, NULL, NEW.created_at, NEW.updated_at);
    END;
  `);

  await db.executeSql(`
    CREATE TRIGGER IF NOT EXISTS ${table}_queue_after_update
    AFTER UPDATE ON ${table}
    WHEN NEW.updated_at <> OLD.updated_at OR NEW.deleted_at IS NOT OLD.deleted_at
    BEGIN
      INSERT OR REPLACE INTO sync_queue
        (id, entity_type, entity_id, operation, attempt_count, last_error, created_at, updated_at)
      VALUES
        ('${entityType}_' || NEW.id, '${entityType}', NEW.id,
         CASE WHEN NEW.deleted_at IS NULL THEN 'upsert' ELSE 'delete' END,
         0, NULL, OLD.created_at, NEW.updated_at);
    END;
  `);
};

export const runMigrations = async (db: any) => {
  await db.transaction((tx: any) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY NOT NULL,
        property_id TEXT NOT NULL,
        name TEXT NOT NULL,
        monthly_rent REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'vacant',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(property_id) REFERENCES properties(id)
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY NOT NULL,
        unit_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        monthly_rent REAL NOT NULL DEFAULT 0,
        due_day INTEGER NOT NULL DEFAULT 1,
        move_in_date TEXT NOT NULL,
        security_deposit REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(unit_id) REFERENCES units(id)
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS rent_cycles (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        rent_amount REAL NOT NULL DEFAULT 0,
        due_date TEXT NOT NULL,
        total_paid REAL NOT NULL DEFAULT 0,
        balance REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'unpaid',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(tenant_id, month, year),
        FOREIGN KEY(tenant_id) REFERENCES tenants(id)
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY NOT NULL,
        rent_cycle_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_mode TEXT NOT NULL,
        reference_no TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(rent_cycle_id) REFERENCES rent_cycles(id),
        FOREIGN KEY(tenant_id) REFERENCES tenants(id)
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  });

  for (const table of ['properties', 'units', 'tenants', 'rent_cycles', 'payments']) {
    for (const [column, definition] of syncColumns) {
      await addColumnIfMissing(db, table, column, definition);
    }
  }
  await addColumnIfMissing(db, 'payments', 'updated_at', 'TEXT');
  await db.executeSql('UPDATE payments SET updated_at = created_at WHERE updated_at IS NULL');

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(entity_type, entity_id)
    );
  `);

  const syncTables = [
    ['properties', 'property'],
    ['units', 'unit'],
    ['tenants', 'tenant'],
    ['rent_cycles', 'rentCycle'],
    ['payments', 'payment'],
  ] as const;

  for (const [table, entityType] of syncTables) {
    await createSyncTriggers(db, table, entityType);
    await db.executeSql(`
      INSERT OR IGNORE INTO sync_queue
        (id, entity_type, entity_id, operation, attempt_count, last_error, created_at, updated_at)
      SELECT '${entityType}_' || id, '${entityType}', id,
        CASE WHEN deleted_at IS NULL THEN 'upsert' ELSE 'delete' END,
        0, NULL, created_at, updated_at
      FROM ${table}
      WHERE sync_status <> 'synced';
    `);
  }

  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_sync_queue_updated_at ON sync_queue(updated_at)');
};
