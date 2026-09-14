import { executeBatch, executeSql, SqlStatement } from '../db';
import { tenantRepo } from './tenantRepo';
import { PaymentMode, Settlement, SettlementStatement, Tenant } from '../../types/models';
import { dueDateFor, isValidDate, nowIso, todayDate } from '../../utils/dates';

type Bill = { id: string; month: number; year: number; rent_amount: number; electricity_amount: number; paid: number; updated_at: string };
export type SettlementInput = { moveOutDate: string; deposit: number; finalRent: number; finalElectricity: number; deduction: number; deductionReason: string };
const money = (amount: number) => Math.round(amount * 100) / 100;

export const settlementRepo = {
  async findForTenant(tenantId: string) {
    const rows = await executeSql<Settlement>('SELECT * FROM settlements WHERE tenant_id = ? AND deleted_at IS NULL', [tenantId]);
    return rows[0] ?? null;
  },
  all() {
    return executeSql<Settlement>('SELECT * FROM settlements WHERE deleted_at IS NULL ORDER BY transfer_date IS NOT NULL, created_at DESC');
  },
  async load(tenantId: string) {
    const tenant = await tenantRepo.find(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    const bills = await executeSql<Bill>(`SELECT rc.*, COALESCE((SELECT SUM(amount) FROM payments p WHERE p.rent_cycle_id = rc.id AND p.deleted_at IS NULL AND p.voided_at IS NULL), 0) AS paid
      FROM rent_cycles rc WHERE rc.tenant_id = ? AND rc.deleted_at IS NULL ORDER BY year, month`, [tenantId]);
    return { tenant, bills };
  },
  preview(source: { tenant: Tenant & { property_name: string; unit_name: string }; bills: Bill[] }, input: SettlementInput): SettlementStatement {
    const { tenant, bills } = source;
    if (!isValidDate(input.moveOutDate) || input.moveOutDate < tenant.move_in_date || input.moveOutDate > todayDate()) {
      throw new Error('Move-out date must be between move-in and today');
    }
    for (const amount of [input.deposit, input.finalRent, input.finalElectricity, input.deduction]) {
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e10 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) {
        throw new Error('Enter non-negative amounts with at most two decimal places');
      }
    }
    if (input.deduction > 0 && !input.deductionReason.trim()) throw new Error('Explain the deduction');
    const year = Number(input.moveOutDate.slice(0, 4));
    const month = Number(input.moveOutDate.slice(5, 7));
    const period = year * 12 + month;
    if (bills.some(bill => bill.year * 12 + bill.month > period)) throw new Error('Bills exist after this move-out month. Review the move-out date before continuing.');
    const final = bills.find(bill => bill.year === year && bill.month === month);
    const previousBalance = money(bills.filter(bill => bill !== final).reduce((total, bill) => total + bill.rent_amount + bill.electricity_amount - bill.paid, 0));
    return {
      tenantName: tenant.name, propertyName: tenant.property_name, unitName: tenant.unit_name, phone: tenant.phone,
      ...input, deductionReason: input.deductionReason.trim(), previousBalance, finalPayments: final?.paid ?? 0,
      balance: money(previousBalance + input.finalRent + input.finalElectricity - (final?.paid ?? 0) + input.deduction - input.deposit),
      bills: bills.map(bill => ({ month: bill.month, year: bill.year, rent: bill.rent_amount, electricity: bill.electricity_amount, paid: bill.paid })),
    };
  },
  async finalize(tenantId: string, input: SettlementInput, expected: SettlementStatement) {
    const source = await this.load(tenantId);
    if (source.tenant.settlement_id) throw new Error('This tenancy is already closed');
    const statement = this.preview(source, input);
    if (JSON.stringify(statement) !== JSON.stringify(expected)) throw new Error('Bills changed. Reload and review the settlement again.');
    const timestamp = nowIso();
    const id = `settlement_${tenantId}`;
    const { tenant, bills } = source;
    // The INSERT guard rechecks every bill and effective payment total inside the native transaction.
    const guards: string[] = ['t.id = ?', 't.status = ?', 't.deleted_at IS NULL', 't.updated_at = ?', 't.security_deposit = ?',
      '(SELECT COUNT(*) FROM rent_cycles WHERE tenant_id = t.id AND deleted_at IS NULL) = ?'];
    const guardParams: unknown[] = [tenantId, tenant.status, tenant.updated_at, tenant.security_deposit, bills.length];
    for (const bill of bills) {
      guards.push(`EXISTS (SELECT 1 FROM rent_cycles rc WHERE rc.id = ? AND rc.deleted_at IS NULL AND rc.updated_at = ? AND rc.rent_amount = ? AND rc.electricity_amount = ?
        AND COALESCE((SELECT SUM(amount) FROM payments WHERE rent_cycle_id = rc.id AND deleted_at IS NULL AND voided_at IS NULL), 0) = ?)`);
      guardParams.push(bill.id, bill.updated_at, bill.rent_amount, bill.electricity_amount, bill.paid);
    }
    const year = Number(input.moveOutDate.slice(0, 4));
    const month = Number(input.moveOutDate.slice(5, 7));
    const final = bills.find(bill => bill.year === year && bill.month === month);
    const cycleId = final?.id ?? `cycle_${tenantId}_${year}_${String(month).padStart(2, '0')}`;
    const statements: SqlStatement[] = [
      [`INSERT INTO settlements (id, tenant_id, statement_json, balance, transfer_date, created_at, updated_at)
        VALUES (?, (SELECT t.id FROM tenants t WHERE ${guards.join(' AND ')}), ?, ?, ?, ?, ?)`,
      [id, ...guardParams, JSON.stringify(statement), statement.balance, statement.balance === 0 ? input.moveOutDate : null, timestamp, timestamp]],
    ];
    if (!final) statements.push([
      `INSERT INTO rent_cycles (id, tenant_id, month, year, rent_amount, electricity_amount, total_payable, due_date, total_paid, balance, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?, ?)`,
      [cycleId, tenantId, month, year, input.finalRent, input.finalElectricity, money(input.finalRent + input.finalElectricity), dueDateFor(month, year, tenant.due_day), money(input.finalRent + input.finalElectricity), timestamp, timestamp],
    ]);
    else statements.push([
      `UPDATE rent_cycles SET rent_amount = ?, electricity_amount = ?, total_payable = ?, total_paid = ?, balance = ?, updated_at = ?, sync_status = 'pending', version = version + 1 WHERE id = ?`,
      [input.finalRent, input.finalElectricity, money(input.finalRent + input.finalElectricity), final.paid, money(input.finalRent + input.finalElectricity - final.paid), timestamp, cycleId],
    ]);
    statements.push(
      ["UPDATE tenants SET status = 'inactive', updated_at = ?, sync_status = 'pending', version = version + 1 WHERE id = ?", [timestamp, tenantId]],
      ["UPDATE units SET status = 'vacant', updated_at = ?, sync_status = 'pending', version = version + 1 WHERE id = ? AND NOT EXISTS (SELECT 1 FROM tenants WHERE unit_id = ? AND status = 'active' AND deleted_at IS NULL)", [timestamp, tenant.unit_id, tenant.unit_id]],
    );
    try { await executeBatch(statements); }
    catch { throw new Error('Settlement was not saved. Reload to check for changed bills or an existing settlement, then retry.'); }
    return id;
  },
  async completeTransfer(tenantId: string, date: string, mode: PaymentMode, reference: string) {
    const settlement = await this.findForTenant(tenantId);
    if (!settlement) throw new Error('Settlement not found');
    const statement: SettlementStatement = JSON.parse(settlement.statement_json);
    if (!isValidDate(date) || date < statement.moveOutDate || date > todayDate()) throw new Error('Transfer date must be between move-out and today');
    if (!['cash', 'upi', 'bank_transfer', 'cheque', 'other'].includes(mode)) throw new Error('Select a payment method');
    await executeBatch([[`UPDATE settlements SET transfer_date = ?, transfer_mode = ?, transfer_reference = ?, updated_at = ?, sync_status = 'pending', version = version + 1
      WHERE id = ? AND transfer_date IS NULL AND deleted_at IS NULL`, [date, mode, reference.trim(), nowIso(), settlement.id]]]);
  },
};
