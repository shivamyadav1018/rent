const mockGetDocFromServer = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  collection: jest.fn(),
  doc: (...parts: unknown[]) => parts.slice(1).join('/'),
  getDoc: jest.fn(),
  getDocFromServer: (...args: unknown[]) => mockGetDocFromServer(...args),
  getDocs: jest.fn(),
  getFirestore: () => 'firestore',
  query: jest.fn(),
  runTransaction: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
}));

import { tenantApplicationService } from '../src/services/tenantApplicationService';

test('normalises a tenant-friendly formatted invite code', () => {
  expect(tenantApplicationService.normaliseCode(' ab-12 c3 ')).toBe('AB12C3');
});

test('rejects an expired public invite before showing the tenant form', async () => {
  mockGetDocFromServer.mockResolvedValue({
    data: () => ({ expires_at_ms: Date.now() - 1000, status: 'active' }),
    exists: () => true,
    id: 'ABC123',
  });
  await expect(tenantApplicationService.lookupInvite('abc123')).rejects.toThrow('expired');
});
