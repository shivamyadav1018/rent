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
    if (input.id && await this.find(input.id)) {
      await executeWrite(
        `UPDATE properties
         SET name = ?, type = ?, address = ?, updated_at = ?, sync_status = 'pending', version = version + 1
         WHERE id = ?`,
        [input.name, input.type, input.address ?? null, timestamp, id],
      );
    } else {
      await executeWrite(
        `INSERT INTO properties (id, name, type, address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, input.name, input.type, input.address ?? null, timestamp, timestamp],
      );
    }
    return id;
  },
};
