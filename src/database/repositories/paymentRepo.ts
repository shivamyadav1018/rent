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

  // Improvement 6: CSV export query
  forYear(year: number) {
    return executeSql<{ id: string; amount: number; payment_date: string; payment_mode: string; reference_no: string | null; notes: string | null; tenant_name: string; unit_name: string; property_name: string; month: number; year: number }>(
      `SELECT p.id, p.amount, p.payment_date, p.payment_mode, p.reference_no, p.notes,
         t.name AS tenant_name,
         u.name AS unit_name,
         pr.name AS property_name,
         rc.month, rc.year
       FROM payments p
       JOIN tenants t ON t.id = p.tenant_id
       JOIN units u ON u.id = t.unit_id
       JOIN properties pr ON pr.id = u.property_id
       JOIN rent_cycles rc ON rc.id = p.rent_cycle_id
       WHERE strftime('%Y', p.payment_date) = ?
       ORDER BY p.payment_date ASC`,
      [String(year)],
    );
  },

  // Improvement 9: payment mode breakdown
  modeBreakdownForMonth(month: number, year: number) {
    return executeSql<{ payment_mode: string; total: number; count: number }>(
      `SELECT p.payment_mode, COALESCE(SUM(p.amount), 0) AS total, COUNT(*) AS count
       FROM payments p
       JOIN rent_cycles rc ON rc.id = p.rent_cycle_id
       WHERE rc.month = ? AND rc.year = ?
       GROUP BY p.payment_mode`,
      [month, year],
    );
  },

  // Improvement 10: annual summary
  annualSummary(year: number) {
    return executeSql<{ month: number; collected: number; expected: number }>(
      `SELECT rc.month,
         COALESCE(SUM(p.amount), 0) AS collected,
         COALESCE(SUM(rc.rent_amount), 0) AS expected
       FROM rent_cycles rc
       LEFT JOIN payments p ON p.rent_cycle_id = rc.id
       WHERE rc.year = ?
       GROUP BY rc.month
       ORDER BY rc.month ASC`,
      [year],
    );
  },
};
