import { tenantInviteService } from '../src/services/tenantInviteService';

test('invite message contains the code, destination and privacy guidance', () => {
  const message = tenantInviteService.message({
    code: 'AB7K9P',
    expires_at: '2026-09-22T12:00:00.000Z',
    landlordName: 'Shivam',
    property_name: 'Lake House',
    tenant_name: 'Rahul',
    unit_name: 'Flat 101',
  });

  expect(message).toContain('Hi Rahul');
  expect(message).toContain('Lake House, Flat 101');
  expect(message).toContain('Invite code: AB7K9P');
  expect(message).toContain('Use invite code');
  expect(message).toContain('No email, password or OTP');
  expect(message).toContain('Do not send Aadhaar');
});
