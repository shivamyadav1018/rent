import type { TenantInviteListItem } from '../database/repositories/tenantInviteRepo';
import { displayDate } from '../utils/dates';

type InviteMessageInput = Pick<
  TenantInviteListItem,
  'code' | 'expires_at' | 'property_name' | 'tenant_name' | 'unit_name'
> & { landlordName?: string };

export const tenantInviteService = {
  message(invite: InviteMessageInput) {
    const greeting = invite.tenant_name ? `Hi ${invite.tenant_name},` : 'Hello,';
    const owner = invite.landlordName ? ` from ${invite.landlordName}` : '';
    return [
      greeting,
      '',
      `You are invited${owner} to provide tenant details for ${invite.property_name}, ${invite.unit_name}.`,
      `Invite code: ${invite.code}`,
      `Valid until: ${displayDate(invite.expires_at)}`,
      '',
      'Open the KirayaBahi app, tap "Use invite code", and enter the code above. No email, password or OTP is required.',
      'Do not send Aadhaar or other ID documents on WhatsApp.',
      '',
      'Sent from KirayaBahi',
    ].join('\n');
  },
};
