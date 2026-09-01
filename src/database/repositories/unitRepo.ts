import { Unit, UnitStatus } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite } from '../db';

export const unitRepo = {
  forProperty(propertyId: string) {
    return executeSql<Unit>('SELECT * FROM units WHERE property_id = ? ORDER BY name ASC', [propertyId]);
  },

  allWithProperty() {
    return executeSql<Unit & { property_name: string }>(`
      SELECT u.*, p.name AS property_name
      FROM units u
      JOIN properties p ON p.id = u.property_id
      ORDER BY p.name ASC, u.name ASC
    `);
  },

  async find(id: string) {
    const rows = await executeSql<Unit>('SELECT * FROM units WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async save(input: {
    id?: string;
    property_id: string;
    name: string;
    monthly_rent: number;
    status: UnitStatus;
  }) {
    const timestamp = nowIso();
    const id = input.id ?? createId('unit');
    if (input.id && await this.find(input.id)) {
      await executeWrite(
        `UPDATE units
         SET property_id = ?, name = ?, monthly_rent = ?, status = ?, updated_at = ?,
             sync_status = 'pending', version = version + 1
         WHERE id = ?`,
        [input.property_id, input.name, input.monthly_rent, input.status, timestamp, id],
      );
    } else {
      await executeWrite(
        `INSERT INTO units (id, property_id, name, monthly_rent, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, input.property_id, input.name, input.monthly_rent, input.status, timestamp, timestamp],
      );
    }
    return id;
  },

  markOccupied(unitId: string) {
    return executeWrite(
      `UPDATE units
       SET status = ?, updated_at = ?, sync_status = 'pending', version = version + 1
       WHERE id = ?`,
      ['occupied', nowIso(), unitId],
    );
  },

  markVacant(unitId: string) {
    return executeWrite(
      `UPDATE units
       SET status = ?, updated_at = ?, sync_status = 'pending', version = version + 1
       WHERE id = ?`,
      ['vacant', nowIso(), unitId],
    );
  },

  async deactivateTenantUnits(tenantId: string) {
    // Find the unit currently linked to this tenant and mark it vacant
    const rows = await executeSql<{ unit_id: string }>(
      'SELECT unit_id FROM tenants WHERE id = ?',
      [tenantId],
    );
    const unitId = rows[0]?.unit_id;
    if (unitId) await this.markVacant(unitId);
  },
};
