// Execute repository SQL against SQLite, including the real migration schema.
const { DatabaseSync } = require('node:sqlite');
let mockDatabase: InstanceType<typeof DatabaseSync>;
jest.mock('../src/database/db', () => ({
  executeSql: async (sql: string, params: unknown[] = []) => mockDatabase.prepare(sql).all(...params),
  executeWrite: async (sql: string, params: unknown[] = []) => { mockDatabase.prepare(sql).run(...params); },
}));

import { runMigrations } from '../src/database/migrations';
import { paymentRepo } from '../src/database/repositories/paymentRepo';
import { propertyRepo } from '../src/database/repositories/propertyRepo';
import { unitRepo } from '../src/database/repositories/unitRepo';
import { tenantRepo } from '../src/database/repositories/tenantRepo';
import { rentRepo } from '../src/database/repositories/rentRepo';

beforeEach(async () => {
  mockDatabase = new DatabaseSync(':memory:');
  const adapter = {
    executeSql(sql: string) {
      const rows = mockDatabase.prepare(sql).all();
      return Promise.resolve([{ rows: { length: rows.length, item: (index: number) => rows[index] } }]);
    },
    async transaction(callback: (tx: unknown) => void) { callback(adapter); },
  };
  await runMigrations(adapter);
  mockDatabase.exec(`
    INSERT INTO properties (id, name, type, created_at, updated_at) VALUES ('property', 'Home', 'house', '2026-06-01', '2026-06-01');
    INSERT INTO units (id, property_id, name, status, created_at, updated_at) VALUES ('unit', 'property', 'Room', 'occupied', '2026-06-01', '2026-06-01');
    INSERT INTO tenants (id, unit_id, name, phone, move_in_date, created_at, updated_at) VALUES ('tenant', 'unit', 'Tenant', '9876543210', '2026-06-01', '2026-06-01', '2026-06-01');
    INSERT INTO rent_cycles (id, tenant_id, month, year, due_date, total_paid, created_at, updated_at) VALUES ('cycle', 'tenant', 6, 2026, '2026-06-05', 500, '2026-06-01', '2026-06-01');
    INSERT INTO payments (id, rent_cycle_id, tenant_id, amount, payment_date, payment_mode, created_at, updated_at) VALUES ('live', 'cycle', 'tenant', 200, '2026-06-02', 'cash', '2026-06-02', '2026-06-02');
    INSERT INTO payments (id, rent_cycle_id, tenant_id, amount, payment_date, payment_mode, created_at, updated_at, deleted_at) VALUES ('deleted', 'cycle', 'tenant', 300, '2026-06-03', 'cash', '2026-06-03', '2026-06-03', '2026-06-04');
  `);
});
afterEach(() => mockDatabase.close());

test('deleted payments are excluded from balances, receipts, history, and counts', async () => {
  await expect(paymentRepo.totalForCycle('cycle')).resolves.toBe(200);
  await expect(paymentRepo.latestForCycle('cycle')).resolves.toMatchObject({ id: 'live' });
  await expect(paymentRepo.forTenant('tenant')).resolves.toHaveLength(1);
  await expect(paymentRepo.count()).resolves.toEqual([{ count: 1 }]);
});

test('a deleted property and its descendants are hidden from lists and the ledger', async () => {
  mockDatabase.exec("UPDATE properties SET deleted_at = '2026-06-04' WHERE id = 'property'");
  await expect(propertyRepo.all()).resolves.toEqual([]);
  await expect(propertyRepo.listWithCounts()).resolves.toEqual([]);
  await expect(propertyRepo.find('property')).resolves.toBeNull();
  await expect(unitRepo.allWithProperty()).resolves.toEqual([]);
  await expect(tenantRepo.list()).resolves.toEqual([]);
  await expect(tenantRepo.active()).resolves.toEqual([]);
  await expect(tenantRepo.find('tenant')).resolves.toBeNull();
  await expect(rentRepo.ledger(6, 2026)).resolves.toEqual([]);
  await expect(rentRepo.findLedgerItem('cycle')).resolves.toBeNull();
  await expect(rentRepo.recentPaid()).resolves.toEqual([]);
});

test('deleted units do not count toward property occupancy', async () => {
  mockDatabase.exec("UPDATE units SET deleted_at = '2026-06-04' WHERE id = 'unit'");
  await expect(propertyRepo.listWithCounts()).resolves.toEqual([expect.objectContaining({ total_units: 0, occupied_units: 0 })]);
  await expect(unitRepo.forProperty('property')).resolves.toEqual([]);
  await expect(unitRepo.find('unit')).resolves.toBeNull();
});

test('inactive tenants retain their history while deleted tenants leave the ledger', async () => {
  mockDatabase.exec("UPDATE tenants SET status = 'inactive' WHERE id = 'tenant'");
  await expect(tenantRepo.list()).resolves.toEqual([]);
  await expect(tenantRepo.list('', true)).resolves.toHaveLength(1);
  await expect(rentRepo.ledger(6, 2026)).resolves.toHaveLength(1);
  mockDatabase.exec("UPDATE tenants SET deleted_at = '2026-06-04' WHERE id = 'tenant'");
  await expect(tenantRepo.list('', true)).resolves.toEqual([]);
  await expect(rentRepo.ledger(6, 2026)).resolves.toEqual([]);
});

test('deleted cycles are hidden but retain their tombstone to prevent regeneration', async () => {
  mockDatabase.exec("UPDATE rent_cycles SET deleted_at = '2026-06-04' WHERE id = 'cycle'");
  await expect(rentRepo.ledger(6, 2026)).resolves.toEqual([]);
  await expect(paymentRepo.forTenant('tenant')).resolves.toEqual([]);
  await expect(rentRepo.findCycle('tenant', 6, 2026)).resolves.toMatchObject({ deleted_at: '2026-06-04' });
});
