// Execute repository SQL against SQLite, including the real migration schema.
const { DatabaseSync } = require('node:sqlite');
let mockDatabase: InstanceType<typeof DatabaseSync>;
jest.mock('../src/database/db', () => ({
  getDb: async () => ({ executeSql: async (sql: string, params: unknown[] = []) => {
    const rows = mockDatabase.prepare(sql).all(...params);
    return [{ rows: { length: rows.length, item: (index: number) => rows[index] } }];
  } }),
  executeBatch: async (statements: [string, unknown[]][]) => {
    mockDatabase.exec('BEGIN');
    try {
      for (const [sql, params] of statements) mockDatabase.prepare(sql).run(...params);
      mockDatabase.exec('COMMIT');
    } catch (error) { mockDatabase.exec('ROLLBACK'); throw error; }
  },
  executeSql: async (sql: string, params: unknown[] = []) => mockDatabase.prepare(sql).all(...params),
  executeWrite: async (sql: string, params: unknown[] = []) => { mockDatabase.prepare(sql).run(...params); },
}));

import { settlementRepo } from '../src/database/repositories/settlementRepo';
import { runMigrations } from '../src/database/migrations';
import { paymentRepo } from '../src/database/repositories/paymentRepo';
import { propertyRepo } from '../src/database/repositories/propertyRepo';
import { unitRepo } from '../src/database/repositories/unitRepo';
import { tenantRepo } from '../src/database/repositories/tenantRepo';
import { syncRepo } from '../src/database/repositories/syncRepo';
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

test('payment transaction preserves snapshots and excludes voids without erasing history', async () => {
  mockDatabase.exec("UPDATE rent_cycles SET rent_amount = 1000, electricity_amount = 200, total_payable = 1200 WHERE id = 'cycle'");
  await paymentRepo.recordAtomic({ id: 'first', cycleId: 'cycle', tenantId: 'tenant', amount: 400, electricityAmount: 300, paymentDate: '2026-06-10', paymentMode: 'cash' });
  await expect(paymentRepo.find('first')).resolves.toMatchObject({ receipt_rent: 1000, receipt_electricity: 300, receipt_balance: 700, receipt_tenant: 'Tenant' });
  await paymentRepo.recordAtomic({ id: 'second', cycleId: 'cycle', tenantId: 'tenant', amount: 200, paymentDate: '2026-06-11', paymentMode: 'upi' });
  await expect(rentRepo.findCycle('tenant', 6, 2026)).resolves.toMatchObject({ total_paid: 800, balance: 500 });
  await paymentRepo.voidPayment('first', 'Entered against wrong tenant');
  await expect(paymentRepo.totalForCycle('cycle')).resolves.toBe(400);
  await expect(rentRepo.findCycle('tenant', 6, 2026)).resolves.toMatchObject({ total_paid: 400, balance: 900 });
  await expect(paymentRepo.find('first')).resolves.toMatchObject({ amount: 400, receipt_balance: 700, void_reason: 'Entered against wrong tenant' });
  await expect(paymentRepo.forTenant('tenant')).resolves.toHaveLength(3);
  await paymentRepo.voidPayment('first', 'Repeated tap');
  await expect(paymentRepo.find('first')).resolves.toMatchObject({ void_reason: 'Entered against wrong tenant' });
});

test('failed totals update rolls back payment, bill change and sync queue together', async () => {
  const beforeCycle = await rentRepo.findCycle('tenant', 6, 2026);
  const beforeQueue = mockDatabase.prepare('SELECT * FROM sync_queue ORDER BY id').all();
  mockDatabase.exec("CREATE TRIGGER fail_totals BEFORE UPDATE OF total_paid ON rent_cycles BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
  await expect(paymentRepo.recordAtomic({ id: 'failed', cycleId: 'cycle', tenantId: 'tenant', amount: 400, electricityAmount: 999, paymentDate: '2026-06-10', paymentMode: 'cash' })).rejects.toThrow('injected failure');
  await expect(paymentRepo.find('failed')).resolves.toBeNull();
  await expect(rentRepo.findCycle('tenant', 6, 2026)).resolves.toEqual(beforeCycle);
  expect(mockDatabase.prepare('SELECT * FROM sync_queue ORDER BY id').all()).toEqual(beforeQueue);
});

test('failed void leaves original payment active and its totals unchanged', async () => {
  mockDatabase.exec("CREATE TRIGGER fail_totals BEFORE UPDATE OF total_paid ON rent_cycles BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
  await expect(paymentRepo.voidPayment('live', 'Wrong amount')).rejects.toThrow();
  await expect(paymentRepo.find('live')).resolves.toMatchObject({ voided_at: null, void_reason: null });
});

test('deleted cycle cannot receive a new payment and blank correction reasons are rejected', async () => {
  mockDatabase.exec("UPDATE rent_cycles SET deleted_at = '2026-06-04' WHERE id = 'cycle'");
  await expect(paymentRepo.recordAtomic({ id: 'failed', cycleId: 'cycle', tenantId: 'tenant', amount: 400, paymentDate: '2026-06-10', paymentMode: 'cash' })).rejects.toThrow();
  await expect(paymentRepo.find('failed')).resolves.toBeNull();
  await expect(paymentRepo.voidPayment('live', ' ')).rejects.toThrow('reason');
});


test('cloud transfer preserves receipt snapshots and correction history', async () => {
  await paymentRepo.recordAtomic({ id: 'cloud', cycleId: 'cycle', tenantId: 'tenant', amount: 100, paymentDate: '2026-06-10', paymentMode: 'cash' });
  await paymentRepo.voidPayment('cloud', 'Duplicate entry');
  const uploaded = await syncRepo.entity('payment', 'cloud');
  mockDatabase.prepare('DELETE FROM payments WHERE id = ?').run('cloud');
  await syncRepo.applyRemoteEntity('payment', uploaded!, 'owner');
  await expect(paymentRepo.find('cloud')).resolves.toMatchObject({ receipt_tenant: 'Tenant', receipt_balance: -300, void_reason: 'Duplicate entry', owner_id: 'owner' });
  await syncRepo.reconcileRentCycles();
  await expect(paymentRepo.totalForCycle('cycle')).resolves.toBe(200);
});

const settlementInput = { moveOutDate: '2026-06-10', deposit: 10000, finalRent: 2000, finalElectricity: 650, deduction: 500, deductionReason: 'Agreed cleaning charge' };

test('settlement applies deposits and final utilities once, retains history and releases the room', async () => {
  // The fixture has a 200 live payment and a deleted 300 payment.
  const source = await settlementRepo.load('tenant');
  const preview = settlementRepo.preview(source, settlementInput);
  expect(preview.balance).toBe(-7050);
  await settlementRepo.finalize('tenant', settlementInput, preview);
  await expect(tenantRepo.find('tenant')).resolves.toMatchObject({ status: 'inactive', settlement_id: 'settlement_tenant' });
  await expect(unitRepo.find('unit')).resolves.toMatchObject({ status: 'vacant' });
  await expect(paymentRepo.forTenant('tenant')).resolves.toHaveLength(1);
  await expect(settlementRepo.findForTenant('tenant')).resolves.toMatchObject({ balance: -7050, transfer_date: null });
  await expect(rentRepo.ledger(6, 2026)).resolves.toEqual([expect.objectContaining({ status: 'settled', total_payable: 2650, total_paid: 200 })]);
  await expect(rentRepo.ledger(6, 2026, 'unpaid')).resolves.toEqual([]);
  await expect(settlementRepo.finalize('tenant', settlementInput, preview)).rejects.toThrow('closed');
  await expect(paymentRepo.voidPayment('live', 'Wrong amount')).rejects.toThrow('final settlement');
  await expect(paymentRepo.recordAtomic({ id: 'late', cycleId: 'cycle', tenantId: 'tenant', amount: 100, paymentDate: '2026-06-11', paymentMode: 'cash' })).rejects.toThrow();
  await settlementRepo.completeTransfer('tenant', '2026-06-11', 'upi', 'refund-123');
  await settlementRepo.completeTransfer('tenant', '2026-06-12', 'cash', 'duplicate tap');
  await expect(settlementRepo.findForTenant('tenant')).resolves.toMatchObject({ transfer_date: '2026-06-11', transfer_mode: 'upi', transfer_reference: 'refund-123' });
});

test('a failed move-out rolls back the settlement, final charges, tenant, room and sync queue', async () => {
  const preview = settlementRepo.preview(await settlementRepo.load('tenant'), settlementInput);
  const before = mockDatabase.prepare('SELECT * FROM rent_cycles').all();
  const queue = mockDatabase.prepare('SELECT * FROM sync_queue ORDER BY id').all();
  mockDatabase.exec("CREATE TRIGGER fail_release BEFORE UPDATE OF status ON units BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
  await expect(settlementRepo.finalize('tenant', settlementInput, preview)).rejects.toThrow('not saved');
  await expect(settlementRepo.findForTenant('tenant')).resolves.toBeNull();
  await expect(tenantRepo.find('tenant')).resolves.toMatchObject({ status: 'active' });
  await expect(unitRepo.find('unit')).resolves.toMatchObject({ status: 'occupied' });
  expect(mockDatabase.prepare('SELECT * FROM rent_cycles').all()).toEqual(before);
  expect(mockDatabase.prepare('SELECT * FROM sync_queue ORDER BY id').all()).toEqual(queue);
});

test('changed payments invalidate the reviewed settlement and do not close the tenant', async () => {
  const preview = settlementRepo.preview(await settlementRepo.load('tenant'), settlementInput);
  await paymentRepo.recordAtomic({ id: 'extra', cycleId: 'cycle', tenantId: 'tenant', amount: 100, paymentDate: '2026-06-10', paymentMode: 'cash' });
  await expect(settlementRepo.finalize('tenant', settlementInput, preview)).rejects.toThrow('changed');
  await expect(tenantRepo.find('tenant')).resolves.toMatchObject({ status: 'active' });
});

test('previous-month credits reduce final dues and zero-balance settlement needs no transfer', async () => {
  const source = await settlementRepo.load('tenant');
  const input = { ...settlementInput, moveOutDate: '2026-07-10', deposit: 0, finalRent: 200, finalElectricity: 0, deduction: 0 };
  const preview = settlementRepo.preview(source, input);
  expect(preview.previousBalance).toBe(-200);
  expect(preview.balance).toBe(0);
  await settlementRepo.finalize('tenant', input, preview);
  await expect(settlementRepo.findForTenant('tenant')).resolves.toMatchObject({ balance: 0, transfer_date: '2026-07-10' });
  await expect(rentRepo.findCycle('tenant', 7, 2026)).resolves.toMatchObject({ rent_amount: 200 });
});

test('settlement rejects invalid amounts, unexplained deductions and dates outside the tenancy', async () => {
  const source = await settlementRepo.load('tenant');
  for (const bad of [{ deposit: -1 }, { finalRent: NaN }, { finalElectricity: 1.234 }, { deductionReason: ' ' }, { moveOutDate: '2026-05-30' }, { moveOutDate: '2099-06-01' }, { moveOutDate: '2026-02-30' }]) {
    expect(() => settlementRepo.preview(source, { ...settlementInput, ...bad })).toThrow();
  }
});

test('settlement statement and transfer survive cloud round trips', async () => {
  const preview = settlementRepo.preview(await settlementRepo.load('tenant'), { ...settlementInput, deposit: 0 });
  expect(preview.balance).toBe(2950);
  await settlementRepo.finalize('tenant', { ...settlementInput, deposit: 0 }, preview);
  await settlementRepo.completeTransfer('tenant', '2026-06-11', 'bank_transfer', 'collection-123');
  const uploaded = await syncRepo.entity('settlement', 'settlement_tenant');
  mockDatabase.exec("DELETE FROM settlements WHERE id = 'settlement_tenant'");
  await syncRepo.applyRemoteEntity('settlement', uploaded!, 'owner');
  const restored = await settlementRepo.findForTenant('tenant');
  expect(restored).toMatchObject({ transfer_date: '2026-06-11', transfer_reference: 'collection-123', balance: 2950, owner_id: 'owner' });
  expect(JSON.parse(restored!.statement_json)).toEqual(preview);
});
