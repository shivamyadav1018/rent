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
    // Improvement 3: duplicate unit name check
    const duplicates = await executeSql<{ id: string }>(
      'SELECT id FROM units WHERE property_id = ? AND LOWER(name) = LOWER(?) AND id <> ?',
      [input.property_id, input.name, input.id ?? ''],
    );
    if (duplicates.length > 0) {
      throw new Error('A unit with this name already exists in this property.');
    }
    const timestamp = nowIso();
    const id = input.id ?? createId('unit');
    await executeWrite(
      `INSERT OR REPLACE INTO units (id, property_id, name, monthly_rent, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM units WHERE id = ?), ?), ?)`,
      [id, input.property_id, input.name, input.monthly_rent, input.status, id, timestamp, timestamp],
    );
    return id;
  },

  // Improvement 11: vacancy stats per property
  vacancyStats() {
    return executeSql<{ property_name: string; total: number; occupied: number; vacant: number }>(
      `SELECT p.name AS property_name,
         COUNT(u.id) AS total,
         SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) AS occupied,
         SUM(CASE WHEN u.status = 'vacant' THEN 1 ELSE 0 END) AS vacant
       FROM units u
       JOIN properties p ON p.id = u.property_id
       GROUP BY p.id, p.name
       ORDER BY p.name ASC`,
    );
  },

  markOccupied(unitId: string) {
    return executeWrite('UPDATE units SET status = ?, updated_at = ? WHERE id = ?', ['occupied', nowIso(), unitId]);
  },
};
