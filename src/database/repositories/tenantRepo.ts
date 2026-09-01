import { Tenant } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite } from '../db';
import { unitRepo } from './unitRepo';

export const tenantRepo = {
  list(search = '', includeInactive = false) {
    const term = `%${search.trim()}%`;
    const statusFilter = includeInactive ? '' : "AND t.status = 'active'";
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
      WHERE (t.name LIKE ? OR t.phone LIKE ?) ${statusFilter}
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
  }) {
    const timestamp = nowIso();
    const id = input.id ?? createId('tenant');
    const values = [
      input.unit_id,
      input.name,
      input.phone,
      input.monthly_rent,
      input.due_day,
      input.move_in_date,
      input.security_deposit,
      input.notes ?? null,
    ];
    if (input.id) {
      const existing = await this.find(input.id);
      if (existing) {
        // Release old unit if tenant is moving to a different unit
        if (existing.unit_id !== input.unit_id) {
          await unitRepo.markVacant(existing.unit_id);
        }
        await executeWrite(
          `UPDATE tenants
           SET unit_id = ?, name = ?, phone = ?, monthly_rent = ?, due_day = ?, move_in_date = ?,
               security_deposit = ?, notes = ?, updated_at = ?, sync_status = 'pending', version = version + 1
           WHERE id = ?`,
          [...values, timestamp, id],
        );
      } else {
        // id was provided but no row found — insert as new
        await executeWrite(
          `INSERT INTO tenants
           (id, unit_id, name, phone, monthly_rent, due_day, move_in_date, security_deposit, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
          [id, ...values, timestamp, timestamp],
        );
      }
    } else {
      await executeWrite(
        `INSERT INTO tenants
         (id, unit_id, name, phone, monthly_rent, due_day, move_in_date, security_deposit, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [id, ...values, timestamp, timestamp],
      );
    }
    await unitRepo.markOccupied(input.unit_id);
    return id;
  },

  async deactivate(tenantId: string) {
    const tenant = await this.find(tenantId);
    if (!tenant) return;
    const timestamp = nowIso();
    await executeWrite(
      `UPDATE tenants
       SET status = 'inactive', updated_at = ?, sync_status = 'pending', version = version + 1
       WHERE id = ?`,
      [timestamp, tenantId],
    );
    await unitRepo.markVacant(tenant.unit_id);
  },
};
