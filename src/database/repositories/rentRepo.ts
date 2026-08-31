import { LedgerItem, RentCycle, RentStatus } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite } from '../db';

export const rentRepo = {
  async findLedgerItem(id: string) {
    const rows = await executeSql<LedgerItem>(
      `
      SELECT rc.*, t.name AS tenant_name, t.phone AS tenant_phone, u.name AS unit_name, p.name AS property_name
      FROM rent_cycles rc
      JOIN tenants t ON t.id = rc.tenant_id
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE rc.id = ?
      `,
      [id],
    );
    return rows[0] ?? null;
  },

  async findCycle(tenantId: string, month: number, year: number) {
    const rows = await executeSql<RentCycle>(
      'SELECT * FROM rent_cycles WHERE tenant_id = ? AND month = ? AND year = ?',
      [tenantId, month, year],
    );
    return rows[0] ?? null;
  },

  async createCycle(input: {
    tenant_id: string;
    month: number;
    year: number;
    rent_amount: number;
    due_date: string;
  }) {
    const timestamp = nowIso();
    const id = createId('cycle');
    await executeWrite(
      `INSERT OR IGNORE INTO rent_cycles
       (id, tenant_id, month, year, rent_amount, due_date, total_paid, balance, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?, ?)`,
      [id, input.tenant_id, input.month, input.year, input.rent_amount, input.due_date, input.rent_amount, timestamp, timestamp],
    );
    return id;
  },

  ledger(month: number, year: number, status = 'all', propertyId?: string) {
    const params: any[] = [month, year];
    const filters = ['rc.month = ?', 'rc.year = ?'];
    if (status !== 'all') {
      filters.push('rc.status = ?');
      params.push(status);
    }
    if (propertyId) {
      filters.push('p.id = ?');
      params.push(propertyId);
    }

    return executeSql<LedgerItem>(
      `
      SELECT rc.*, t.name AS tenant_name, t.phone AS tenant_phone, u.name AS unit_name, p.name AS property_name
      FROM rent_cycles rc
      JOIN tenants t ON t.id = rc.tenant_id
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE ${filters.join(' AND ')}
      ORDER BY rc.due_date ASC, t.name ASC
    `,
      params,
    );
  },

  recentPaid() {
    return executeSql<LedgerItem>(`
      SELECT rc.*, t.name AS tenant_name, t.phone AS tenant_phone, u.name AS unit_name, p.name AS property_name
      FROM rent_cycles rc
      JOIN tenants t ON t.id = rc.tenant_id
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE rc.total_paid > 0
      ORDER BY rc.updated_at DESC
      LIMIT 5
    `);
  },

  async updateTotals(id: string, totalPaid: number, balance: number, status: RentStatus) {
    await executeWrite(
      'UPDATE rent_cycles SET total_paid = ?, balance = ?, status = ?, updated_at = ? WHERE id = ?',
      [totalPaid, balance, status, nowIso(), id],
    );
  },
};
