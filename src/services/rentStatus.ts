import { RentCycle, RentStatus } from '../types/models';
import { isPastDue } from '../utils/dates';

export const statusFor = (cycle: Pick<RentCycle, 'balance' | 'due_date' | 'total_paid'>): RentStatus => {
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

