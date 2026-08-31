import { paymentRepo } from '../database/repositories/paymentRepo';
import { rentRepo } from '../database/repositories/rentRepo';
import { tenantRepo } from '../database/repositories/tenantRepo';
import { PaymentMode, RentCycle, RentStatus } from '../types/models';
import { currentMonthYear, dueDateFor, isPastDue } from '../utils/dates';

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
  async ensureCycleForTenant(tenantId: string, month: number, year: number) {
    const existing = await rentRepo.findCycle(tenantId, month, year);
    if (existing) {
      const updatedStatus = statusFor(existing);
      if (updatedStatus !== existing.status) {
        await rentRepo.updateTotals(existing.id, existing.total_paid, existing.balance, updatedStatus);
      }
      return { ...existing, status: updatedStatus };
    }

    const tenant = await tenantRepo.find(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    await rentRepo.createCycle({
      due_date: dueDateFor(month, year, tenant.due_day),
      month,
      rent_amount: tenant.monthly_rent,
      tenant_id: tenant.id,
      year,
    });

    return rentRepo.findCycle(tenantId, month, year);
  },

  async ensureCurrentCycleForTenant(tenantId: string) {
    const { month, year } = currentMonthYear();
    return this.ensureCycleForTenant(tenantId, month, year);
  },

  async ensureCyclesForMonth(month: number, year: number) {
    const tenants = await tenantRepo.active();
    await Promise.all(tenants.map(tenant => this.ensureCycleForTenant(tenant.id, month, year)));
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
    const cycle = await this.ensureCycleForTenant(input.tenantId, input.month, input.year);
    if (!cycle) {
      throw new Error('Rent cycle could not be created');
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
