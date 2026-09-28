import { Tenant } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeBatch, SqlStatement } from '../db';
import { unitRepo } from './unitRepo';

export const tenantRepo = {
  list(search = '') {
    const term = `%${search.trim()}%`;
    return executeSql<Tenant & { unit_name: string; property_name: string; current_status?: string }>(
      `
      SELECT t.*, u.name AS unit_name, p.name AS property_name,
        rc.status AS current_status
      FROM tenants t
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      LEFT JOIN rent_cycles rc ON rc.tenant_id = t.id
        AND rc.month = CAST(strftime('%m', 'now') AS INTEGER)
        AND rc.year = CAST(strftime('%Y', 'now') AS INTEGER)
      WHERE t.name LIKE ? OR t.phone LIKE ?
      ORDER BY t.created_at DESC
    `,
      [term, term],
    );
  },

  active() {
    return executeSql<Tenant>('SELECT * FROM tenants WHERE status = ? ORDER BY name ASC', ['active']);
  },

  async find(id: string) {
    const rows = await executeSql<Tenant & { unit_name: string; property_name: string }>(
      `
      SELECT t.*, u.name AS unit_name, p.name AS property_name
      FROM tenants t
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE t.id = ?
    `,
      [id],
    );
    return rows[0] ?? null;
  },

  async save(input: {
    id?: string;
    unit_id: string;
    name: string;
    phone: string;
    monthly_rent: number;
    due_day: number;
    move_in_date: string;
    security_deposit: number;
    notes?: string;
    lease_start?: string;
    lease_end?: string;
  }) {
    const timestamp = nowIso();
    const id = input.id ?? createId('tenant');

    // Improvement 2: duplicate phone check
    const duplicates = await executeSql<{ id: string }>(
      "SELECT id FROM tenants WHERE phone = ? AND status = 'active' AND id <> ?",
      [input.phone, id],
    );
    if (duplicates.length > 0) {
      throw new Error('A tenant with this phone number already exists.');
    }

    const statements: SqlStatement[] = [];

    // Tenant upsert (Improvement 1: atomic)
    statements.push([
      `INSERT OR REPLACE INTO tenants
       (id, unit_id, name, phone, monthly_rent, due_day, move_in_date, security_deposit, status, notes, lease_start, lease_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, COALESCE((SELECT created_at FROM tenants WHERE id = ?), ?), ?)`,
      [
        id,
        input.unit_id,
        input.name,
        input.phone,
        input.monthly_rent,
        input.due_day,
        input.move_in_date,
        input.security_deposit,
        input.notes ?? null,
        input.lease_start ?? null,
        input.lease_end ?? null,
        id,
        timestamp,
        timestamp,
      ],
    ]);

    // Unit occupied update (Improvement 1: same batch)
    statements.push([
      'UPDATE units SET status = ?, updated_at = ? WHERE id = ?',
      ['occupied', timestamp, input.unit_id],
    ]);

    await executeBatch(statements);
    return id;
  },

  async deactivate(tenantId: string) {
    const tenant = await this.find(tenantId);
    if (!tenant || tenant.status !== 'active') return;
    const timestamp = nowIso();
    // Improvement 1: atomic tenant deactivate + unit vacancy
    await executeBatch([
      [`UPDATE tenants SET status = 'inactive', updated_at = ? WHERE id = ?`, [timestamp, tenantId]],
      ['UPDATE units SET status = ?, updated_at = ? WHERE id = ?', ['vacant', timestamp, tenant.unit_id]],
    ]);
  },
};
