import { Payment, PaymentMode } from '../../types/models';
import { nowIso, todayDate } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite, executeBatch, SqlStatement } from '../db';

const totalsStatements = (cycleId: string, timestamp: string): SqlStatement[] => [
  [`UPDATE rent_cycles SET total_paid = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE rent_cycle_id = ? AND deleted_at IS NULL AND voided_at IS NULL) WHERE id = ?`, [cycleId, cycleId]],
  [`UPDATE rent_cycles SET balance = total_payable - total_paid,
    status = CASE WHEN total_payable - total_paid <= 0 THEN 'paid' WHEN total_paid > 0 THEN 'partial' WHEN due_date < ? THEN 'overdue' ELSE 'unpaid' END,
    updated_at = ?, sync_status = 'pending', version = version + 1 WHERE id = ?`, [todayDate(), timestamp, cycleId]],
];

export const paymentRepo = {
  async find(id: string) {
    const rows = await executeSql<Payment>('SELECT * FROM payments WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] ?? null;
  },

  async voidPayment(id: string, reason: string) {
    if (!reason.trim()) throw new Error('Enter a reason for the correction');
    const payment = await this.find(id);
    if (!payment) throw new Error('Payment not found');
    const closed = await executeSql('SELECT id FROM settlements WHERE tenant_id = ? AND deleted_at IS NULL', [payment.tenant_id]);
    if (closed.length) throw new Error('This payment belongs to a final settlement and cannot be voided.');
    const timestamp = nowIso();
    await executeBatch([
      [`UPDATE payments SET voided_at = ?, void_reason = ?, updated_at = ?, sync_status = 'pending', version = version + 1
        WHERE id = ? AND deleted_at IS NULL AND voided_at IS NULL`, [timestamp, reason.trim(), timestamp, id]],
      ...totalsStatements(payment.rent_cycle_id, timestamp),
    ]);
  },

  async recordAtomic(input: {
    id: string; cycleId: string; tenantId: string; amount: number; electricityAmount?: number;
    meterPrevReading?: number | null; meterNewReading?: number | null;
    paymentDate: string; paymentMode: PaymentMode; referenceNo?: string; notes?: string;
  }) {
    const timestamp = nowIso();
    const statements: SqlStatement[] = [];
    if (input.electricityAmount !== undefined) statements.push([
      `UPDATE rent_cycles SET electricity_amount = ?, total_payable = rent_amount + ?,
        meter_prev_reading = COALESCE(?, meter_prev_reading),
        meter_new_reading = COALESCE(?, meter_new_reading)
       WHERE id = ? AND deleted_at IS NULL`,
      [input.electricityAmount, input.electricityAmount,
       input.meterPrevReading ?? null, input.meterNewReading ?? null,
       input.cycleId],
    ]);
    statements.push([
      `INSERT INTO payments (id, rent_cycle_id, tenant_id, amount, payment_date, payment_mode, reference_no, notes, created_at, updated_at,
        receipt_rent, receipt_electricity, receipt_balance, receipt_tenant, receipt_property, receipt_unit, receipt_landlord)
       VALUES (?, (SELECT id FROM rent_cycles WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM settlements WHERE tenant_id = rent_cycles.tenant_id AND deleted_at IS NULL)), ?, ?, ?, ?, ?, ?, ?, ?,
        (SELECT rent_amount FROM rent_cycles WHERE id = ?),
        (SELECT electricity_amount FROM rent_cycles WHERE id = ?),
        (SELECT total_payable - ? - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE rent_cycle_id = ? AND deleted_at IS NULL AND voided_at IS NULL) FROM rent_cycles WHERE id = ?),
        (SELECT name FROM tenants WHERE id = ?),
        (SELECT p.name FROM properties p JOIN units u ON u.property_id = p.id JOIN tenants t ON t.unit_id = u.id WHERE t.id = ?),
        (SELECT u.name FROM units u JOIN tenants t ON t.unit_id = u.id WHERE t.id = ?),
        COALESCE((SELECT value FROM settings WHERE key = 'landlordName'), 'Landlord'))`,
      [input.id, input.cycleId, input.tenantId, input.tenantId, input.amount, input.paymentDate, input.paymentMode,
        input.referenceNo ?? null, input.notes ?? null, timestamp, timestamp,
        input.cycleId, input.cycleId, input.amount, input.cycleId, input.cycleId, input.tenantId, input.tenantId, input.tenantId],
    ], ...totalsStatements(input.cycleId, timestamp));
    await executeBatch(statements);
    return input.id;
  },
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
    const timestamp = nowIso();
    await executeWrite(
      `INSERT INTO payments
       (id, rent_cycle_id, tenant_id, amount, payment_date, payment_mode, reference_no, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.rent_cycle_id,
        input.tenant_id,
        input.amount,
        input.payment_date,
        input.payment_mode,
        input.reference_no ?? null,
        input.notes ?? null,
        timestamp,
        timestamp,
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
      WHERE p.tenant_id = ? AND p.deleted_at IS NULL AND rc.deleted_at IS NULL
      ORDER BY p.payment_date DESC
    `,
      [tenantId],
    );
  },

  async latestForCycle(rentCycleId: string) {
    const rows = await executeSql<Payment>(
      'SELECT * FROM payments WHERE rent_cycle_id = ? AND deleted_at IS NULL AND voided_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [rentCycleId],
    );
    return rows[0] ?? null;
  },

  async totalForCycle(rentCycleId: string) {
    const rows = await executeSql<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE rent_cycle_id = ? AND deleted_at IS NULL AND voided_at IS NULL',
      [rentCycleId],
    );
    return rows[0]?.total ?? 0;
  },

  count() {
    return executeSql<{ count: number }>('SELECT COUNT(*) AS count FROM payments WHERE deleted_at IS NULL');
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
