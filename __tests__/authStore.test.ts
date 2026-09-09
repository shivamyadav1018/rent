const mockAuth = { isConfigured: true, subscribe: jest.fn(), signOut: jest.fn() };
const mockSync = { start: jest.fn(), stop: jest.fn(), sync: jest.fn() };
const mockRepo = { localOwner: jest.fn(), claimLocalData: jest.fn() };
const mockApp = { resetSession: jest.fn(), bootstrap: jest.fn() };
jest.mock('../src/services/authService', () => ({ authService: mockAuth }));
jest.mock('../src/services/cloudSyncService', () => ({ cloudSyncService: mockSync }));
jest.mock('../src/services/pushNotificationService', () => ({ pushNotificationService: { resume: jest.fn().mockResolvedValue(false), stopForSignOut: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('../src/database/repositories/syncRepo', () => ({ syncRepo: mockRepo }));
jest.mock('../src/store/appStore', () => ({ useAppStore: { getState: () => mockApp } }));
jest.mock('@react-native-google-signin/google-signin', () => ({ isErrorWithCode: () => false, statusCodes: {} }));

const { useAuthStore } = require('../src/store/authStore') as typeof import('../src/store/authStore');

const user = { uid: 'owner', email: 'owner@example.com', displayName: null, photoURL: null };
let notifyAuth: (value: typeof user | null) => Promise<void>;
let cleanup: () => void;
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => { resolve = next; });
  return { promise, resolve };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.subscribe.mockImplementation(listener => { notifyAuth = listener; return jest.fn(); });
  mockAuth.signOut.mockResolvedValue(undefined);
  mockSync.start.mockResolvedValue(true);
  mockRepo.localOwner.mockResolvedValue(null);
  mockRepo.claimLocalData.mockResolvedValue(undefined);
  mockApp.bootstrap.mockResolvedValue(true);
  cleanup = useAuthStore.getState().initialize();
});
afterEach(() => cleanup());

test('ignores a sign-in lookup completed after sign-out notification', async () => {
  const owner = deferred<string | null>();
  mockRepo.localOwner.mockReturnValueOnce(owner.promise);
  const signingIn = notifyAuth(user);
  await notifyAuth(null);
  owner.resolve(null);
  await signingIn;
  expect(mockRepo.claimLocalData).not.toHaveBeenCalled();
  expect(mockSync.start).not.toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', user: null });
});

test('does not bootstrap a session after its auth listener is removed', async () => {
  const sync = deferred<boolean>();
  mockSync.start.mockReturnValueOnce(sync.promise);
  const signingIn = notifyAuth(user);
  await Promise.resolve();
  await Promise.resolve();
  cleanup();
  sync.resolve(true);
  await signingIn;
  expect(mockApp.bootstrap).not.toHaveBeenCalled();
});

test('cloud changes reload settings as well as rent records', async () => {
  await notifyAuth(user);
  mockApp.bootstrap.mockClear();
  await mockSync.start.mock.calls[0][1].onDataChanged();
  expect(mockApp.bootstrap).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user });
});

test('a delayed sync callback cannot refresh the signed-out session', async () => {
  await notifyAuth(user);
  const callbacks = mockSync.start.mock.calls[0][1];
  await notifyAuth(null);
  mockApp.bootstrap.mockClear();
  callbacks.onDataChanged();
  callbacks.onState({ status: 'synced', pendingCount: 0, lastSyncedAt: 'late', error: null });
  expect(mockApp.bootstrap).not.toHaveBeenCalled();
  expect(useAuthStore.getState().syncStatus).toBe('disabled');
});
