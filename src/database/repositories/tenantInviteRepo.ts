import { TenantInvite } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite } from '../db';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const createCode = () => Array.from(
  { length: 6 },
  () => alphabet[Math.floor(Math.random() * alphabet.length)],
).join('');

const expiryFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export type TenantInviteListItem = TenantInvite & {
  property_name: string;
  unit_name: string;
};

export const tenantInviteRepo = {
  async find(id: string) {
    const rows = await executeSql<TenantInviteListItem>(`
      SELECT i.*, p.name AS property_name, u.name AS unit_name
      FROM tenant_invites i
      JOIN properties p ON p.id = i.property_id
      JOIN units u ON u.id = i.unit_id
      WHERE i.id = ? AND i.deleted_at IS NULL
    `, [id]);
    return rows[0] ?? null;
  },

  async list() {
    const timestamp = nowIso();
    await executeWrite(
      `UPDATE tenant_invites
       SET status = 'expired', updated_at = ?, sync_status = 'pending', version = version + 1
       WHERE status = 'active' AND expires_at <= ? AND deleted_at IS NULL`,
      [timestamp, timestamp],
    );
    return executeSql<TenantInviteListItem>(`
      SELECT i.*, p.name AS property_name, u.name AS unit_name
      FROM tenant_invites i
      JOIN properties p ON p.id = i.property_id
      JOIN units u ON u.id = i.unit_id
      WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      ORDER BY CASE WHEN i.status = 'active' THEN 0 ELSE 1 END, i.created_at DESC
    `);
  },

  async create(input: {
    unit_id: string;
    property_id: string;
    tenant_name?: string;
    tenant_phone: string;
    expires_in_days: number;
  }) {
    const unit = await executeSql<{ status: string }>(
      'SELECT status FROM units WHERE id = ? AND property_id = ? AND deleted_at IS NULL',
      [input.unit_id, input.property_id],
    );
    if (!unit.length) throw new Error('The selected unit no longer exists.');
    if (unit[0].status !== 'vacant') throw new Error('The selected unit is no longer vacant.');
    const existing = await executeSql<{ id: string }>(
      "SELECT id FROM tenant_invites WHERE unit_id = ? AND status = 'active' AND expires_at > ? AND deleted_at IS NULL LIMIT 1",
      [input.unit_id, nowIso()],
    );
    if (existing.length) throw new Error('This unit already has an active invite.');

    const id = createId('invite');
    const timestamp = nowIso();
    const expiresAt = expiryFromNow(input.expires_in_days);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = createCode();
      try {
        await executeWrite(
          `INSERT INTO tenant_invites
           (id, code, property_id, unit_id, tenant_name, tenant_phone, status, expires_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
          [id, code, input.property_id, input.unit_id, input.tenant_name?.trim() || null, input.tenant_phone, expiresAt, timestamp, timestamp],
        );
        return {
          code,
          created_at: timestamp,
          expires_at: expiresAt,
          id,
          updated_at: timestamp,
        };
      } catch (error) {
        if (!(error instanceof Error) || !error.message.toLowerCase().includes('unique')) throw error;
      }
    }
    throw new Error('Could not generate a unique invite code. Please try again.');
  },

  markShared(id: string) {
    const timestamp = nowIso();
    return executeWrite(
      `UPDATE tenant_invites
       SET last_shared_at = ?, updated_at = ?, sync_status = 'pending', version = version + 1
       WHERE id = ? AND status = 'active' AND deleted_at IS NULL`,
      [timestamp, timestamp, id],
    );
  },

  cancel(id: string) {
    return executeWrite(
      `UPDATE tenant_invites
       SET status = 'cancelled', updated_at = ?, sync_status = 'pending', version = version + 1
       WHERE id = ? AND status = 'active' AND deleted_at IS NULL`,
      [nowIso(), id],
    );
  },
};
