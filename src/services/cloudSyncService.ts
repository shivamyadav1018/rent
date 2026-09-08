import { AppState } from 'react-native';
import { collection, doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from '@react-native-firebase/firestore';

import { setDatabaseWriteListener } from '../database/db';
import { syncEntityConfig, syncRepo } from '../database/repositories/syncRepo';
import { entityTypes, pullEntities, pushPending, syncProfile } from './sync/operations';
import { createSyncSession, type SyncSession } from './sync/session';

export type CloudSyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error';
export type CloudSyncState = {
  error: string | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  status: CloudSyncStatus;
};
type SyncCallbacks = {
  onDataChanged?: () => void | Promise<void>;
  onState?: (state: CloudSyncState) => void;
};
type ActiveSync = SyncSession & {
  callbacks: SyncCallbacks;
  promise: Promise<boolean> | null;
  again: boolean;
  notify: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  cleanup: Array<() => void>;
};

const emptyState = (): CloudSyncState => ({ error: null, lastSyncedAt: null, pendingCount: 0, status: 'disabled' });
let state = emptyState();
let active: ActiveSync | null = null;

const emit = (session: ActiveSync, updates: Partial<CloudSyncState>) => {
  if (!session.isActive()) return;
  state = { ...state, ...updates };
  session.callbacks.onState?.(state);
};

const schedule = (session: ActiveSync) => {
  if (!session.isActive()) return;
  if (session.timer) clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    session.timer = null;
    cloudSyncService.sync();
  }, 750);
};

const performSync = async (session: ActiveSync) => {
  const { ownerId, run } = session;
  try {
    emit(session, { error: null, pendingCount: await run(() => syncRepo.pendingCount()), status: 'syncing' });
    const entitiesChanged = await pullEntities(session);
    const profileChanged = await syncProfile(session);
    const totalsChanged = await run(() => syncRepo.reconcileRentCycles());
    // Publish restored data even when a subsequent offline upload is still waiting.
    if (session.notify && (entitiesChanged || profileChanged || totalsChanged)) {
      await run(async () => { await session.callbacks.onDataChanged?.(); });
    }
    await pushPending(session);
    await run(() => setDoc(
      doc(getFirestore(), 'users', ownerId),
      { last_synced_at: serverTimestamp() },
      { merge: true },
    ));
    emit(session, {
      error: null,
      lastSyncedAt: new Date().toISOString(),
      pendingCount: await run(() => syncRepo.pendingCount()),
      status: 'synced',
    });
    return true;
  } catch (error) {
    if (!session.isActive()) return false;
    emit(session, { error: error instanceof Error ? error.message : 'Cloud sync failed. Local data is safe.', status: 'error' });
    return false;
  }
};

export const cloudSyncService = {
  getState: () => state,

  async start(ownerId: string, callbacks: SyncCallbacks = {}) {
    this.stop();
    const session: ActiveSync = {
      ...createSyncSession(ownerId, () => active === session),
      callbacks, promise: null, again: false, notify: true, timer: null, cleanup: [],
    };
    active = session;
    emit(session, { ...emptyState(), status: 'idle' });
    setDatabaseWriteListener(() => schedule(session));
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') schedule(session);
    });
    session.cleanup.push(() => subscription.remove());
    try {
      const firestore = getFirestore();
      const onChange = () => schedule(session);
      const onError = (error: Error) => emit(session, { error: error.message, status: 'error' });
      for (const entityType of entityTypes) {
        session.cleanup.push(onSnapshot(
          collection(firestore, 'users', ownerId, syncEntityConfig[entityType].collection), onChange, onError,
        ));
      }
      session.cleanup.push(onSnapshot(doc(firestore, 'users', ownerId, 'profile', 'settings'), onChange, onError));
      return await this.sync();
    } catch (error) {
      emit(session, { error: error instanceof Error ? error.message : 'Could not start cloud sync.', status: 'error' });
      return false;
    }
  },

  stop() {
    const previous = active;
    active = null;
    setDatabaseWriteListener(null);
    if (previous?.timer) clearTimeout(previous.timer);
    previous?.cleanup.forEach(unsubscribe => unsubscribe());
    state = emptyState();
  },

  async sync(notifyDataChanged = true): Promise<boolean> {
    const session = active;
    if (!session) return false;
    if (session.promise) {
      session.again = true;
      session.notify ||= notifyDataChanged;
      return session.promise;
    }
    session.notify = notifyDataChanged;
    session.promise = performSync(session).finally(() => {
      session.promise = null;
      if (session.again && session.isActive()) {
        session.again = false;
        schedule(session);
      }
    });
    return session.promise;
  },
};
