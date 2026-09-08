const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockOnSnapshot = jest.fn((..._args: unknown[]) => jest.fn());
const mockWriteListener = jest.fn();
const mockAppStateRemove = jest.fn();

const mockSyncRepo = {
  applyRemoteEntity: jest.fn(),
  applyRemoteProfile: jest.fn(),
  entity: jest.fn(),
  markFailed: jest.fn(),
  markSynced: jest.fn(),
  pending: jest.fn(),
  pendingCount: jest.fn(),
  profile: jest.fn(),
  reconcileRentCycles: jest.fn(),
};

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: mockAppStateRemove })),
  },
}));
jest.mock('@react-native-firebase/firestore', () => ({
  collection: (...parts: unknown[]) => parts.slice(1).join('/'),
  doc: (...parts: unknown[]) => parts.slice(1).join('/'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getFirestore: () => 'firestore',
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(args[0], args[1], args[2]),
  serverTimestamp: () => 'server-time',
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));
jest.mock('../src/database/db', () => ({
  setDatabaseWriteListener: (...args: unknown[]) => mockWriteListener(...args),
}));
jest.mock('../src/database/repositories/syncRepo', () => ({
  syncEntityConfig: {
    property: {
      collection: 'properties',
      columns: ['id', 'name', 'created_at', 'updated_at', 'owner_id', 'deleted_at', 'version'],
      table: 'properties',
    },
  },
  syncRepo: {
    applyRemoteEntity: (...args: unknown[]) => mockSyncRepo.applyRemoteEntity(...args),
    applyRemoteProfile: (...args: unknown[]) => mockSyncRepo.applyRemoteProfile(...args),
    entity: (...args: unknown[]) => mockSyncRepo.entity(...args),
    markFailed: (...args: unknown[]) => mockSyncRepo.markFailed(...args),
    markSynced: (...args: unknown[]) => mockSyncRepo.markSynced(...args),
    pending: (...args: unknown[]) => mockSyncRepo.pending(...args),
    pendingCount: (...args: unknown[]) => mockSyncRepo.pendingCount(...args),
    profile: (...args: unknown[]) => mockSyncRepo.profile(...args),
    reconcileRentCycles: (...args: unknown[]) => mockSyncRepo.reconcileRentCycles(...args),
  },
}));

import { cloudSyncService } from '../src/services/cloudSyncService';

const emptySnapshot = { docs: [] };
const missingDocument = { exists: () => false };

describe('cloudSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue(emptySnapshot);
    mockGetDoc.mockResolvedValue(missingDocument);
    mockSetDoc.mockResolvedValue(undefined);
    mockSyncRepo.pending.mockResolvedValue([]);
    mockSyncRepo.pendingCount.mockResolvedValue(0);
    mockSyncRepo.profile.mockResolvedValue({});
    mockSyncRepo.reconcileRentCycles.mockResolvedValue(false);
  });

  afterEach(() => cloudSyncService.stop());

  test('uploads queued local records into the signed-in user collection', async () => {
    const queued = {
      attempt_count: 0,
      created_at: '2026-09-04T09:00:00.000Z',
      entity_id: 'property-1',
      entity_type: 'property',
      id: 'property_property-1',
      operation: 'upsert',
      updated_at: '2026-09-04T09:00:00.000Z',
    };
    const property = {
      created_at: queued.created_at,
      id: 'property-1',
      name: 'My building',
      owner_id: 'user-1',
      sync_status: 'pending',
      updated_at: queued.updated_at,
      version: 1,
    };
    mockSyncRepo.pending.mockResolvedValue([queued]);
    mockSyncRepo.entity.mockResolvedValue(property);

    await expect(cloudSyncService.start('user-1')).resolves.toBe(true);

    expect(mockSetDoc).toHaveBeenCalledWith(
      'users/user-1/properties/property-1',
      expect.objectContaining({ id: 'property-1', name: 'My building', owner_id: 'user-1' }),
    );
    expect(mockSetDoc.mock.calls[0][1]).not.toHaveProperty('sync_status');
    expect(mockSyncRepo.markSynced).toHaveBeenCalledWith(queued, 'user-1');
  });

  test('restores a newer cloud record into SQLite', async () => {
    const remote = {
      id: 'property-1',
      name: 'Cloud building',
      owner_id: 'user-1',
      updated_at: '2026-09-04T10:00:00.000Z',
    };
    mockGetDocs.mockResolvedValue({
      docs: [{ data: () => remote, id: remote.id }],
    });
    mockSyncRepo.entity.mockResolvedValue({
      ...remote,
      name: 'Old local building',
      updated_at: '2026-09-04T09:00:00.000Z',
    });

    await cloudSyncService.start('user-1');

    expect(mockSyncRepo.applyRemoteEntity).toHaveBeenCalledWith('property', remote, 'user-1');
  });

  test('keeps local data available when Firestore is unreachable', async () => {
    mockGetDocs.mockRejectedValue(new Error('Network unavailable'));
    const states: Array<{ error: string | null; status: string }> = [];

    await expect(cloudSyncService.start('user-1', {
      onState: nextState => states.push(nextState),
    })).resolves.toBe(false);

    expect(states.at(-1)).toEqual(expect.objectContaining({
      error: 'Network unavailable',
      status: 'error',
    }));
  });
  test('a stopped pull cannot restore data or report success', async () => {
    let finish!: (value: unknown) => void;
    mockGetDocs.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const syncing = cloudSyncService.start('user-1');
    for (let step = 0; step < 10 && !finish; step += 1) await Promise.resolve();
    expect(finish).toBeDefined();
    cloudSyncService.stop();
    finish({ docs: [{ id: 'late', data: () => ({ updated_at: '2026-09-01' }) }] });
    await expect(syncing).resolves.toBe(false);
    expect(mockSyncRepo.applyRemoteEntity).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(cloudSyncService.getState().status).toBe('disabled');
  });

  test('a new session syncs without waiting for the old network request', async () => {
    let finish!: (value: unknown) => void;
    mockGetDocs.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const previous = cloudSyncService.start('user-1');
    for (let step = 0; step < 10 && !finish; step += 1) await Promise.resolve();
    await expect(cloudSyncService.start('user-2')).resolves.toBe(true);
    finish(emptySnapshot);
    await expect(previous).resolves.toBe(false);
    expect(mockSetDoc).toHaveBeenCalledWith('users/user-2', expect.anything(), { merge: true });
    expect(cloudSyncService.getState().status).toBe('synced');
  });

  test('reports queue-read errors instead of rejecting startup', async () => {
    mockSyncRepo.pendingCount.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(cloudSyncService.start('user-1')).resolves.toBe(false);
    expect(cloudSyncService.getState()).toMatchObject({ status: 'error', error: 'Database unavailable' });
  });

  test('notifies restored profile data during the initial sync', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ landlordName: 'Restored', updated_at: '2026-09-01' }) });
    const onDataChanged = jest.fn();
    await cloudSyncService.start('user-1', { onDataChanged });
    expect(onDataChanged).toHaveBeenCalledTimes(1);
  });

  test('equal profile timestamps do not write the same profile repeatedly', async () => {
    mockSyncRepo.profile.mockResolvedValue({ landlordName: 'Owner', cloudProfileUpdatedAt: '2026-09-01' });
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ landlordName: 'Owner', updated_at: '2026-09-01' }) });
    const onDataChanged = jest.fn();
    await cloudSyncService.start('user-1', { onDataChanged });
    expect(mockSyncRepo.applyRemoteProfile).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalledWith('users/user-1/profile/settings', expect.anything());
    expect(onDataChanged).not.toHaveBeenCalled();
  });

});
