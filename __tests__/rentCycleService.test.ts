jest.mock('../src/database/repositories/paymentRepo', () => ({ paymentRepo: { totalForCycle: jest.fn(), create: jest.fn() } }));
jest.mock('../src/database/repositories/rentRepo', () => ({ rentRepo: { findCycle: jest.fn(), createCycle: jest.fn(), updateTotals: jest.fn(), ledger: jest.fn() } }));
jest.mock('../src/database/repositories/tenantRepo', () => ({ tenantRepo: { find: jest.fn(), active: jest.fn() } }));

import { paymentRepo } from '../src/database/repositories/paymentRepo';
import { rentRepo } from '../src/database/repositories/rentRepo';
import { tenantRepo } from '../src/database/repositories/tenantRepo';
import { rentCycleService } from '../src/services/rentCycleService';

const cycle = { id: 'cycle', tenant_id: 'tenant', month: 6, year: 2026, rent_amount: 1000, total_paid: 0, balance: 1000, due_date: '2026-06-05', status: 'unpaid' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(2026, 5, 10, 12));
  (tenantRepo.find as jest.Mock).mockResolvedValue({ id: 'tenant', status: 'active', move_in_date: '2026-06-01', monthly_rent: 1000, due_day: 5 });
  (paymentRepo.totalForCycle as jest.Mock).mockResolvedValue(0);
});
afterEach(() => jest.useRealTimers());

test('does not charge before move-in month', async () => {
  await expect(rentCycleService.ensureCycleForTenant('tenant', 5, 2026)).resolves.toBeNull();
  expect(rentRepo.createCycle).not.toHaveBeenCalled();
});

test('does not create a new cycle for a moved-out tenant', async () => {
  (tenantRepo.find as jest.Mock).mockResolvedValue({ status: 'inactive', move_in_date: '2026-01-01' });
  await expect(rentCycleService.ensureCycleForTenant('tenant', 6, 2026)).resolves.toBeNull();
  expect(rentRepo.createCycle).not.toHaveBeenCalled();
});

test('new cycles have correct overdue status on the first load', async () => {
  (rentRepo.findCycle as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(cycle);
  await expect(rentCycleService.ensureCycleForTenant('tenant', 6, 2026)).resolves.toMatchObject({ status: 'overdue' });
  expect(rentRepo.updateTotals).toHaveBeenCalledWith('cycle', 0, 1000, 'overdue');
});

test('repairs totals if a previous payment was inserted but totals update failed', async () => {
  (rentRepo.findCycle as jest.Mock).mockResolvedValue(cycle);
  (paymentRepo.totalForCycle as jest.Mock).mockResolvedValue(1000);
  await expect(rentCycleService.ensureCycleForTenant('tenant', 6, 2026)).resolves.toMatchObject({ total_paid: 1000, balance: 0, status: 'paid' });
});

test.each([0, -1, NaN, Infinity])('rejects invalid payment amount %s before writing', async amount => {
  await expect(rentCycleService.recordPayment({ tenantId: 'tenant', month: 6, year: 2026, amount, paymentDate: '2026-06-10', paymentMode: 'cash' })).rejects.toThrow('Amount');
  expect(paymentRepo.create).not.toHaveBeenCalled();
});

test('rejects impossible payment dates before writing', async () => {
  await expect(rentCycleService.recordPayment({ tenantId: 'tenant', month: 6, year: 2026, amount: 500, paymentDate: '2026-02-30', paymentMode: 'cash' })).rejects.toThrow('date');
  expect(paymentRepo.create).not.toHaveBeenCalled();
});
