import { Property, PropertyType } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite } from '../db';

export const propertyRepo = {
  all() {
    return executeSql<Property>('SELECT * FROM properties ORDER BY created_at DESC');
  },

  listWithCounts() {
    return executeSql<Property & { total_units: number; occupied_units: number }>(`
      SELECT p.*,
        COUNT(u.id) AS total_units,
        SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) AS occupied_units
      FROM properties p
      LEFT JOIN units u ON u.property_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
  },

  async find(id: string) {
    const rows = await executeSql<Property>('SELECT * FROM properties WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async save(input: { id?: string; name: string; type: PropertyType; address?: string }) {
    const timestamp = nowIso();
    const id = input.id ?? createId('prop');
    await executeWrite(
      `INSERT OR REPLACE INTO properties (id, name, type, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM properties WHERE id = ?), ?), ?)`,
      [id, input.name, input.type, input.address ?? null, id, timestamp, timestamp],
    );
    return id;
  },
};
