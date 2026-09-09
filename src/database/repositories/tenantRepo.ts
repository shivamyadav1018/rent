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
        AND rc.deleted_at IS NULL
        AND rc.month = CAST(strftime('%m', 'now', 'localtime') AS INTEGER)
        AND rc.year = CAST(strftime('%Y', 'now', 'localtime') AS INTEGER)
      WHERE (t.name LIKE ? OR t.phone LIKE ?) ${statusFilter}
        AND t.deleted_at IS NULL AND u.deleted_at IS NULL AND p.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `,
      [term, term],
    );
  },

  active() {
    return executeSql<Tenant & { unit_name: string; property_name: string }>(
      `SELECT t.*, u.name AS unit_name, p.name AS property_name
       FROM tenants t
       JOIN units u ON u.id = t.unit_id
       JOIN properties p ON p.id = u.property_id
       WHERE t.status = ? AND t.deleted_at IS NULL AND u.deleted_at IS NULL AND p.deleted_at IS NULL
       ORDER BY t.name ASC`,
      ['active'],
    );
  },

  async find(id: string) {
    const rows = await executeSql<Tenant & { unit_name: string; property_name: string }>(
      `
      SELECT t.*, u.name AS unit_name, p.name AS property_name
      FROM tenants t
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE t.id = ? AND t.deleted_at IS NULL AND u.deleted_at IS NULL AND p.deleted_at IS NULL
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
    electricity_amount?: number;
    due_day: number;
    move_in_date: string;
    security_deposit: number;
    notes?: string;
  }) {
    const timestamp = nowIso();
    const id = input.id ?? createId('tenant');
    const previous = input.id ? await this.find(input.id) : null;
    if (input.id && !previous) throw new Error('Tenant no longer exists. Reopen the tenant list.');
    const unit = await unitRepo.find(input.unit_id);
    if (!unit) throw new Error('Selected unit no longer exists');
    if (!previous || previous.status === 'active') {
      const occupants = await executeSql<Tenant>(
        "SELECT * FROM tenants WHERE unit_id = ? AND status = 'active' AND deleted_at IS NULL AND id <> ?",
        [input.unit_id, id],
      );
      if (occupants.length > 0 || (unit.status === 'occupied' && previous?.unit_id !== input.unit_id)) {
        throw new Error('This unit is already occupied. Select a vacant unit.');
      }
    }
    let shouldOccupyUnit = true;
    const values = [
      input.unit_id,
      input.name,
      input.phone,
      input.monthly_rent,
      input.electricity_amount ?? 0,
      input.due_day,
      input.move_in_date,
      input.security_deposit,
      input.notes ?? null,
    ];
    if (input.id) {
      const existing = previous;
      if (existing) {
        shouldOccupyUnit = existing.status === 'active';
        // Release old unit if tenant is moving to a different unit
        if (existing.status === 'active' && existing.unit_id !== input.unit_id) {
          await unitRepo.markVacant(existing.unit_id);
        }
        await executeWrite(
          `UPDATE tenants
           SET unit_id = ?, name = ?, phone = ?, monthly_rent = ?, electricity_amount = ?, due_day = ?, move_in_date = ?,
               security_deposit = ?, notes = ?, updated_at = ?, sync_status = 'pending', version = version + 1
           WHERE id = ?`,
          [...values, timestamp, id],
        );
      } else {
        // id was provided but no row found — insert as new
        await executeWrite(
          `INSERT INTO tenants
           (id, unit_id, name, phone, monthly_rent, electricity_amount, due_day, move_in_date, security_deposit, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
          [id, ...values, timestamp, timestamp],
        );
      }
    } else {
      await executeWrite(
        `INSERT INTO tenants
         (id, unit_id, name, phone, monthly_rent, electricity_amount, due_day, move_in_date, security_deposit, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [id, ...values, timestamp, timestamp],
      );
    }
    if (shouldOccupyUnit) {
      await unitRepo.markOccupied(input.unit_id);
    }
    return id;
  },

  async updateIdProof(tenantId: string, proof: {
    name: string | null;
    storagePath: string | null;
    mimeType: string | null;
  }) {
    await executeWrite(
      `UPDATE tenants
       SET id_proof_name = ?, id_proof_storage_path = ?, id_proof_mime_type = ?,
           updated_at = ?, sync_status = 'pending', version = version + 1
       WHERE id = ? AND deleted_at IS NULL`,
      [proof.name, proof.storagePath, proof.mimeType, nowIso(), tenantId],
    );
  },

  async deactivate(tenantId: string) {
    const tenant = await this.find(tenantId);
    if (!tenant || tenant.status !== 'active') return;
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
