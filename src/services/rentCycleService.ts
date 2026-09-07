import { paymentRepo } from '../database/repositories/paymentRepo';
import { rentRepo } from '../database/repositories/rentRepo';
import { tenantRepo } from '../database/repositories/tenantRepo';
import { PaymentMode, RentCycle, RentStatus } from '../types/models';
import { currentMonthYear, dueDateFor, isPastDue, isValidDate } from '../utils/dates';

const statusFor = (cycle: Pick<RentCycle, 'balance' | 'due_date' | 'total_paid'>): RentStatus => {
  if (cycle.balance <= 0) {
    return 'paid';
  }
  if (cycle.total_paid > 0) {
    return 'partial';
  }
  if (isPastDue(cycle.due_date)) {
    return 'overdue';
  }
  return 'unpaid';
};

export const rentCycleService = {
  async ensureCycleForTenant(tenantId: string, month: number, year: number): Promise<RentCycle | null> {
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1 || year > 9999) {
      throw new Error('Select a valid rent month');
    }
    const existing = await rentRepo.findCycle(tenantId, month, year);
    if (existing) {
      const totalPaid = await paymentRepo.totalForCycle(existing.id);
      const balance = existing.rent_amount - totalPaid;
      const reconciled = { ...existing, total_paid: totalPaid, balance };
      const updatedStatus = statusFor(reconciled);
      if (updatedStatus !== existing.status || totalPaid !== existing.total_paid || balance !== existing.balance) {
        await rentRepo.updateTotals(existing.id, totalPaid, balance, updatedStatus);
      }
      return { ...reconciled, status: updatedStatus };
    }

    const tenant = await tenantRepo.find(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const selectedMonth = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
    if (tenant.status !== 'active' || selectedMonth < tenant.move_in_date.slice(0, 7)) return null;

    await rentRepo.createCycle({
      due_date: dueDateFor(month, year, tenant.due_day),
      month,
      rent_amount: tenant.monthly_rent,
      tenant_id: tenant.id,
      year,
    });

    return this.ensureCycleForTenant(tenantId, month, year);
  },

  async ensureCurrentCycleForTenant(tenantId: string) {
    const { month, year } = currentMonthYear();
    return this.ensureCycleForTenant(tenantId, month, year);
  },

  async ensureCyclesForMonth(month: number, year: number) {
    const tenants = await tenantRepo.active();
    const existing = await rentRepo.ledger(month, year);
    const tenantIds = new Set([...tenants.map(tenant => tenant.id), ...existing.map(cycle => cycle.tenant_id)]);
    for (const tenantId of tenantIds) await this.ensureCycleForTenant(tenantId, month, year);
  },

  async recordPayment(input: {
    tenantId: string;
    month: number;
    year: number;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    referenceNo?: string;
    notes?: string;
  }) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Amount must be greater than zero');
    if (!isValidDate(input.paymentDate)) throw new Error('Enter a valid payment date (YYYY-MM-DD)');
    const cycle = await this.ensureCycleForTenant(input.tenantId, input.month, input.year);
    if (!cycle) {
      throw new Error('No rent is due for this tenant in the selected month');
    }

    await paymentRepo.create({
      amount: input.amount,
      notes: input.notes,
      payment_date: input.paymentDate,
      payment_mode: input.paymentMode,
      reference_no: input.referenceNo,
      rent_cycle_id: cycle.id,
      tenant_id: input.tenantId,
    });

    const totalPaid = await paymentRepo.totalForCycle(cycle.id);
    const balance = cycle.rent_amount - totalPaid;
    const status = statusFor({ balance, due_date: cycle.due_date, total_paid: totalPaid });
    await rentRepo.updateTotals(cycle.id, totalPaid, balance, status);

    return rentRepo.findCycle(input.tenantId, input.month, input.year);
  },
};
