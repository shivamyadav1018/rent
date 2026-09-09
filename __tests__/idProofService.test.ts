const mockPick = jest.fn();
const mockKeepLocalCopy = jest.fn();
const mockPutFile = jest.fn();
const mockGetDownloadUrl = jest.fn();
const mockOpenUrl = jest.fn();

jest.mock('react-native', () => ({ Linking: { openURL: (...args: unknown[]) => mockOpenUrl(...args) } }));
jest.mock('@react-native-documents/picker', () => ({
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error),
  keepLocalCopy: (...args: unknown[]) => mockKeepLocalCopy(...args),
  pick: (...args: unknown[]) => mockPick(...args),
  types: { images: 'image/*', pdf: 'application/pdf' },
}));
jest.mock('@react-native-firebase/auth', () => ({ getAuth: () => ({ currentUser: { uid: 'owner-1' } }) }));
jest.mock('@react-native-firebase/storage', () => ({
  deleteObject: jest.fn(),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadUrl(...args),
  getStorage: () => 'storage',
  putFile: (...args: unknown[]) => mockPutFile(...args),
  ref: (_storage: unknown, path: string) => path,
}));

import { idProofService } from '../src/services/idProofService';

beforeEach(() => jest.clearAllMocks());

test('copies a selected proof into app cache before upload', async () => {
  mockPick.mockResolvedValue([{ hasRequestedType: true, name: 'aadhaar.pdf', size: 1024, type: 'application/pdf', uri: 'content://proof' }]);
  mockKeepLocalCopy.mockResolvedValue([{ localUri: 'file:///cache/aadhaar.pdf', sourceUri: 'content://proof', status: 'success' }]);

  await expect(idProofService.pick()).resolves.toEqual({
    localUri: 'file:///cache/aadhaar.pdf',
    mimeType: 'application/pdf',
    name: 'aadhaar.pdf',
    size: 1024,
  });
});

test('rejects ID proofs larger than 10 MB', async () => {
  mockPick.mockResolvedValue([{ hasRequestedType: true, name: 'large.pdf', size: 10 * 1024 * 1024 + 1, type: 'application/pdf', uri: 'content://proof' }]);
  await expect(idProofService.pick()).rejects.toThrow('10 MB');
  expect(mockKeepLocalCopy).not.toHaveBeenCalled();
});

test('uploads proof under the signed-in owner and tenant path', async () => {
  mockPutFile.mockResolvedValue({});
  const result = await idProofService.upload('tenant-1', {
    localUri: 'file:///cache/aadhaar.pdf', mimeType: 'application/pdf', name: 'aadhaar.pdf', size: 1024,
  });
  expect(result.storagePath).toMatch(/^users\/owner-1\/tenant-id-proofs\/tenant-1\//);
  expect(mockPutFile).toHaveBeenCalledWith(result.storagePath, 'file:///cache/aadhaar.pdf', { contentType: 'application/pdf' });
});
