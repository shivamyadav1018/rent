import { Payment, PaymentMode } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite } from '../db';

export const paymentRepo = {
  async create(input: {
    rent_cycle_id: string;
    tenant_id: string;
    amount: number;
    payment_date: string;
    payment_mode: PaymentMode;
    reference_no?: string;
    notes?: string;
  }) {
    const id = createId('pay');
    await executeWrite(
      `INSERT INTO payments
       (id, rent_cycle_id, tenant_id, amount, payment_date, payment_mode, reference_no, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.rent_cycle_id,
        input.tenant_id,
        input.amount,
        input.payment_date,
        input.payment_mode,
        input.reference_no ?? null,
        input.notes ?? null,
        nowIso(),
      ],
    );
    return id;
  },

  forTenant(tenantId: string) {
    return executeSql<Payment & { month: number; year: number }>(
      `
      SELECT p.*, rc.month, rc.year
      FROM payments p
      JOIN rent_cycles rc ON rc.id = p.rent_cycle_id
      WHERE p.tenant_id = ?
      ORDER BY p.payment_date DESC
    `,
      [tenantId],
    );
  },

  async latestForCycle(rentCycleId: string) {
    const rows = await executeSql<Payment>(
      'SELECT * FROM payments WHERE rent_cycle_id = ? ORDER BY created_at DESC LIMIT 1',
      [rentCycleId],
    );
    return rows[0] ?? null;
  },

  async totalForCycle(rentCycleId: string) {
    const rows = await executeSql<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE rent_cycle_id = ?',
      [rentCycleId],
    );
    return rows[0]?.total ?? 0;
  },

  count() {
    return executeSql<{ count: number }>('SELECT COUNT(*) AS count FROM payments');
  },
};
