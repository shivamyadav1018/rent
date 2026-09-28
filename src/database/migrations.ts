const tableHasColumn = async (db: any, table: string, column: string) => {
  const [result] = await db.executeSql(`PRAGMA table_info(${table})`);
  for (let i = 0; i < result.rows.length; i++) {
    if (result.rows.item(i).name === column) return true;
  }
  return false;
};

const addColumnIfMissing = async (db: any, table: string, column: string, definition: string) => {
  if (!(await tableHasColumn(db, table, column))) {
    await db.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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

  // Improvement 4: lease date columns
  await addColumnIfMissing(db, 'tenants', 'lease_start', 'TEXT');
  await addColumnIfMissing(db, 'tenants', 'lease_end', 'TEXT');

  // Improvement 12: expenses table
  await db.executeSql(`CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    property_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    expense_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(property_id) REFERENCES properties(id)
  )`);
};
