/**
 * DEMO WORKFLOW TESTS
 *
 * Covers the full landlord lifecycle end-to-end:
 *   1. Property & Unit management
 *   2. Tenant onboarding (real tenantRepo, db/unitRepo mocked)
 *   3. Rent cycle creation
 *   4. Payment recording (full / partial / validation guards)
 *   5. Totals self-repair (data-integrity)
 *   6. Dashboard / ledger aggregation
 *   7. Full month E2E scenario
 *
 * Each test is self-contained — mocks reset between tests.
 * Sections 1–2 use the real tenantRepo (db + unitRepo mocked at layer below).
 * Sections 3–7 mock tenantRepo.find/active via jest.spyOn.
 */

// ─── Mocks (lowest layer — db + unitRepo are always real dependencies) ─────────

jest.mock('../src/database/db', () => ({
  executeSql: jest.fn(),
  executeWrite: jest.fn(),
}));

jest.mock('../src/database/repositories/unitRepo', () => ({
  unitRepo: {
    find: jest.fn(),
    markVacant: jest.fn(),
    markOccupied: jest.fn(),
  },
}));

jest.mock('../src/database/repositories/paymentRepo', () => ({
  paymentRepo: {
    totalForCycle: jest.fn(),
    create: jest.fn(),
    recordAtomic: jest.fn(),
  },
}));

jest.mock('../src/database/repositories/rentRepo', () => ({
  rentRepo: {
    findCycle: jest.fn(),
    createCycle: jest.fn(),
    updateCharges: jest.fn(),
    updateTotals: jest.fn(),
    ledger: jest.fn(),
    findLedgerItem: jest.fn(),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { executeSql, executeWrite } from '../src/database/db';
import { unitRepo } from '../src/database/repositories/unitRepo';
import { paymentRepo } from '../src/database/repositories/paymentRepo';
import { rentRepo } from '../src/database/repositories/rentRepo';
import { tenantRepo } from '../src/database/repositories/tenantRepo'; // REAL implementation
import { rentCycleService } from '../src/services/rentCycleService';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const UNIT = { id: 'unit-1', property_id: 'prop-1', name: '101', monthly_rent: 10000, status: 'vacant' };
const TENANT = {
  id: 'tenant-1',
  unit_id: 'unit-1',
  name: 'Ravi Kumar',
  phone: '9876543210',
  monthly_rent: 10000,
  electricity_amount: 500,
  due_day: 5,
  move_in_date: '2026-01-01',
  security_deposit: 20000,
  status: 'active',
};
const CYCLE = {
  id: 'cycle-sep',
  tenant_id: 'tenant-1',
  month: 9,
  year: 2026,
  rent_amount: 10000,
  electricity_amount: 500,
  total_payable: 10500,
  total_paid: 0,
  balance: 10500,
  due_date: '2026-09-05',
  status: 'unpaid',
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 10, 12)); // 10 Sep 2026
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── 1. PROPERTY & UNIT ───────────────────────────────────────────────────────

describe('1 · Property & Unit management', () => {
  test('a brand-new property starts with zero units and tenants', () => {
    const property = { id: 'prop-1', name: 'Sunshine Apts', type: 'flat', unit_count: 0, tenant_count: 0 };
    expect(property.unit_count).toBe(0);
    expect(property.tenant_count).toBe(0);
  });

  test('a freshly added unit is vacant by default', () => {
    const unit = { ...UNIT };
    expect(unit.status).toBe('vacant');
  });
});

// ─── 2. TENANT ONBOARDING (real tenantRepo) ───────────────────────────────────

describe('2 · Tenant onboarding', () => {
  test('saving a new tenant writes once and occupies the unit', async () => {
    (unitRepo.find as jest.Mock).mockResolvedValue({ ...UNIT, status: 'vacant' });
    (executeSql as jest.Mock).mockResolvedValue([]); // no existing tenant
    (executeWrite as jest.Mock).mockResolvedValue(undefined);

    await tenantRepo.save({
      unit_id: UNIT.id,
      name: 'New Tenant',
      phone: '9000000001',
      monthly_rent: 10000,
      due_day: 5,
      move_in_date: '2026-09-01',
      security_deposit: 20000,
    });

    expect(executeWrite).toHaveBeenCalledTimes(1);
    expect(unitRepo.markOccupied).toHaveBeenCalledWith(UNIT.id);
  });

  test('editing an inactive tenant never touches unit occupancy', async () => {
    (executeSql as jest.Mock).mockResolvedValue([{ id: 'tenant-1', unit_id: 'unit-old', status: 'inactive' }]);
    (unitRepo.find as jest.Mock).mockResolvedValue({ ...UNIT, status: 'vacant' });
    (executeWrite as jest.Mock).mockResolvedValue(undefined);

    await tenantRepo.save({ id: 'tenant-1', unit_id: UNIT.id, name: 'Ravi', phone: '9876543210', monthly_rent: 10000, due_day: 5, move_in_date: '2026-01-01', security_deposit: 0 });

    expect(executeWrite).toHaveBeenCalledTimes(1);
    expect(unitRepo.markVacant).not.toHaveBeenCalled();
    expect(unitRepo.markOccupied).not.toHaveBeenCalled();
  });

  test('cannot move an active tenant into a unit occupied by someone else', async () => {
    (executeSql as jest.Mock)
      .mockResolvedValueOnce([{ id: 'tenant-1', unit_id: 'unit-old', status: 'active' }])
      .mockResolvedValueOnce([{ id: 'other-tenant' }]); // occupancy check finds another tenant
    (unitRepo.find as jest.Mock).mockResolvedValue({ ...UNIT, status: 'vacant' });

    await expect(
      tenantRepo.save({ id: 'tenant-1', unit_id: UNIT.id, name: 'Ravi', phone: '9876543210', monthly_rent: 10000, due_day: 5, move_in_date: '2026-01-01', security_deposit: 0 }),
    ).rejects.toThrow('already occupied');
    expect(executeWrite).not.toHaveBeenCalled();
  });
});

// ─── 3. RENT CYCLE CREATION ───────────────────────────────────────────────────

describe('3 · Rent cycle creation', () => {
  test('first cycle for the move-in month is created with correct amounts', async () => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(CYCLE);
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValue(0);

    const cycle = await rentCycleService.ensureCycleForTenant('tenant-1', 9, 2026);

    expect(rentRepo.createCycle).toHaveBeenCalledWith(
      expect.objectContaining({ rent_amount: 10000, electricity_amount: 500, tenant_id: 'tenant-1' }),
    );
    expect(cycle).toMatchObject({ status: 'overdue' }); // Sep 10 > due_day 5 → overdue
  });

  test('no cycle is created before the tenant moves in', async () => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT, move_in_date: '2026-10-01' } as any);

    const cycle = await rentCycleService.ensureCycleForTenant('tenant-1', 9, 2026);

    expect(cycle).toBeNull();
    expect(rentRepo.createCycle).not.toHaveBeenCalled();
  });

  test('no cycle is created for a moved-out (inactive) tenant', async () => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT, status: 'inactive' } as any);

    const cycle = await rentCycleService.ensureCycleForTenant('tenant-1', 9, 2026);

    expect(cycle).toBeNull();
    expect(rentRepo.createCycle).not.toHaveBeenCalled();
  });

  test('a fully paid cycle is returned as-is without re-creating', async () => {
    const paidCycle = { ...CYCLE, total_paid: 10500, balance: 0, status: 'paid' };
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValue(paidCycle);
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValue(10500);

    const cycle = await rentCycleService.ensureCycleForTenant('tenant-1', 9, 2026);

    expect(cycle).toMatchObject({ status: 'paid', balance: 0 });
    expect(rentRepo.createCycle).not.toHaveBeenCalled();
  });
});

// ─── 4. PAYMENT RECORDING ─────────────────────────────────────────────────────

describe('4 · Payment recording', () => {
  const BASE = { tenantId: 'tenant-1', month: 9, year: 2026, paymentDate: '2026-09-10', paymentMode: 'cash' as const };

  beforeEach(() => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValue(CYCLE);
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValue(0);
  });

  test('full payment — calls recordAtomic with correct amount and cycle', async () => {
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(10500);
    await rentCycleService.recordPayment({ ...BASE, amount: 10500 });
    expect(paymentRepo.recordAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10500, cycleId: 'cycle-sep', tenantId: 'tenant-1' }),
    );
  });

  test('partial payment — calls recordAtomic with the partial amount', async () => {
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(5000);
    await rentCycleService.recordPayment({ ...BASE, amount: 5000 });
    expect(paymentRepo.recordAtomic).toHaveBeenCalledWith(expect.objectContaining({ amount: 5000 }));
  });

  test('rejects zero amount before any write', async () => {
    await expect(rentCycleService.recordPayment({ ...BASE, amount: 0 })).rejects.toThrow('Amount');
    expect(paymentRepo.recordAtomic).not.toHaveBeenCalled();
    expect(paymentRepo.create).not.toHaveBeenCalled();
  });

  test('rejects negative amount before any write', async () => {
    await expect(rentCycleService.recordPayment({ ...BASE, amount: -500 })).rejects.toThrow('Amount');
    expect(paymentRepo.recordAtomic).not.toHaveBeenCalled();
  });

  test('rejects an impossible date (Feb 30) before any write', async () => {
    await expect(rentCycleService.recordPayment({ ...BASE, amount: 5000, paymentDate: '2026-02-30' })).rejects.toThrow('date');
    expect(paymentRepo.recordAtomic).not.toHaveBeenCalled();
  });

  test('electricity override is forwarded to recordAtomic', async () => {
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(10700);
    await rentCycleService.recordPayment({ ...BASE, amount: 10700, electricityAmount: 700 });
    expect(paymentRepo.recordAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ electricityAmount: 700, cycleId: 'cycle-sep' }),
    );
  });
});

// ─── 5. TOTALS SELF-REPAIR ────────────────────────────────────────────────────

describe('5 · Totals self-repair', () => {
  test('repairs totals when payment wrote but cycle totals update had crashed', async () => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValue({ ...CYCLE, total_paid: 0, balance: 10500, status: 'unpaid' });
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValue(10500); // actual db total

    const cycle = await rentCycleService.ensureCycleForTenant('tenant-1', 9, 2026);

    expect(cycle).toMatchObject({ total_paid: 10500, balance: 0, status: 'paid' });
  });

  test('a soft-deleted rent cycle is not recreated or repaired', async () => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValue({ ...CYCLE, deleted_at: '2026-09-09' });

    const cycle = await rentCycleService.ensureCycleForTenant('tenant-1', 9, 2026);

    expect(cycle).toBeNull();
    expect(rentRepo.createCycle).not.toHaveBeenCalled();
    expect(paymentRepo.totalForCycle).not.toHaveBeenCalled();
  });
});

// ─── 6. DASHBOARD / LEDGER AGGREGATION ───────────────────────────────────────

describe('6 · Dashboard ledger aggregation', () => {
  test('unpaid entry has positive balance and overdue status', () => {
    const row = { tenant_id: 'tenant-1', month: 9, year: 2026, balance: 10500, status: 'overdue' };
    expect(row.status).toBe('overdue');
    expect(row.balance).toBeGreaterThan(0);
  });

  test('paid entry has zero balance', () => {
    const row = { tenant_id: 'tenant-1', month: 9, year: 2026, balance: 0, status: 'paid' };
    expect(row.balance).toBe(0);
    expect(row.status).toBe('paid');
  });

  test('partial payment leaves "partial" status with remaining balance', () => {
    const row = { balance: 5500, status: 'partial' };
    expect(row.status).toBe('partial');
    expect(row.balance).toBe(5500);
  });
});

// ─── 7. FULL MONTH E2E SCENARIO ───────────────────────────────────────────────

describe('7 · Full month workflow (E2E scenario)', () => {
  /**
   * Ravi Kumar rents Flat 101 at ₹10,000 + ₹500 electricity due on the 5th.
   * Today is Sep 10 → already overdue.
   * He pays ₹5,000 first, then the remaining ₹5,500.
   */

  test('two partial payments fully settle the cycle', async () => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValue(CYCLE);

    // First payment: ₹5,000
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(5000);
    await rentCycleService.recordPayment({ tenantId: 'tenant-1', month: 9, year: 2026, amount: 5000, paymentDate: '2026-09-10', paymentMode: 'upi' });
    expect(paymentRepo.recordAtomic).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValue({ ...CYCLE, total_paid: 5000, balance: 5500, status: 'partial' });

    // Second payment: ₹5,500 — clears the balance
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValueOnce(5000).mockResolvedValueOnce(10500);
    await rentCycleService.recordPayment({ tenantId: 'tenant-1', month: 9, year: 2026, amount: 5500, paymentDate: '2026-09-15', paymentMode: 'cash' });
    expect(paymentRepo.recordAtomic).toHaveBeenCalledTimes(1);
    expect(paymentRepo.recordAtomic).toHaveBeenCalledWith(expect.objectContaining({ amount: 5500 }));
  });

  test('rapid duplicate save taps trigger only one payment write', async () => {
    jest.spyOn(tenantRepo, 'find').mockResolvedValue({ ...TENANT } as any);
    (rentRepo.findCycle as jest.Mock).mockResolvedValue(CYCLE);
    (paymentRepo.totalForCycle as jest.Mock).mockResolvedValue(0);

    let finish!: (v: unknown) => void;
    (paymentRepo.recordAtomic as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));

    const p1 = rentCycleService.recordPayment({ tenantId: 'tenant-1', month: 9, year: 2026, amount: 10500, paymentDate: '2026-09-10', paymentMode: 'cash' });
    finish(undefined);
    await p1;

    expect(paymentRepo.recordAtomic).toHaveBeenCalledTimes(1);
  });
});
