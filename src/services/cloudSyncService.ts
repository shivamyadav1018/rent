import { AppState, type AppStateStatus } from 'react-native';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import { setDatabaseWriteListener } from '../database/db';
import {
  syncEntityConfig,
  syncRepo,
  type SyncEntityType,
  type SyncQueueItem,
} from '../database/repositories/syncRepo';

export type CloudSyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error';

export type CloudSyncState = {
  error: string | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  status: CloudSyncStatus;
};

type SyncCallbacks = {
  onDataChanged?: () => void;
  onState?: (state: CloudSyncState) => void;
};

const entityTypes = Object.keys(syncEntityConfig) as SyncEntityType[];
const profileFields = ['currency', 'landlordName', 'landlordPhone', 'onboardingDone'] as const;

let activeOwnerId: string | null = null;
let callbacks: SyncCallbacks = {};
let appStateSubscription: { remove: () => void } | null = null;
let remoteUnsubscribers: Array<() => void> = [];
let scheduledSync: ReturnType<typeof setTimeout> | null = null;
let syncPromise: Promise<boolean> | null = null;
let syncAgain = false;

let state: CloudSyncState = {
  error: null,
  lastSyncedAt: null,
  pendingCount: 0,
  status: 'disabled',
};

const emit = (updates: Partial<CloudSyncState>) => {
  state = { ...state, ...updates };
  callbacks.onState?.(state);
};

const timestamp = (value: unknown) => typeof value === 'string' ? value : '';

const isRemoteNewer = (remote: Record<string, unknown>, local: Record<string, unknown>) =>
  timestamp(remote.updated_at) > timestamp(local.updated_at);

const firestoreData = (row: Record<string, unknown>, ownerId: string) =>
  Object.fromEntries(
    Object.entries({ ...row, owner_id: ownerId })
      .filter(([key, value]) => key !== 'sync_status' && value !== undefined),
  );

const pullEntities = async (ownerId: string) => {
  const firestore = getFirestore();
  let changed = false;

  // Parent records are applied first so relational data is complete before the UI refreshes.
  for (const entityType of entityTypes) {
    const config = syncEntityConfig[entityType];
    const snapshot = await getDocs(collection(firestore, 'users', ownerId, config.collection));

    for (const document of snapshot.docs) {
      const remote = { ...document.data(), id: document.id } as Record<string, unknown>;
      if (remote.owner_id && remote.owner_id !== ownerId) continue;
      if (!timestamp(remote.updated_at)) continue;

      const local = await syncRepo.entity(entityType, document.id);
      if (!local || isRemoteNewer(remote, local)) {
        await syncRepo.applyRemoteEntity(entityType, remote, ownerId);
        changed = true;
      }
    }
  }

  return changed;
};

const pushPending = async (ownerId: string) => {
  const firestore = getFirestore();
  const pending = await syncRepo.pending();

  for (const item of pending) {
    try {
      const entityType = item.entity_type as SyncEntityType;
      const config = syncEntityConfig[entityType];
      const row = await syncRepo.entity(entityType, item.entity_id);

      if (!row) {
        // A future hard-delete can leave only its queue record. Keep a small
        // tombstone in Firestore so other devices do not recreate stale data.
        await setDoc(doc(firestore, 'users', ownerId, config.collection, item.entity_id), {
          deleted_at: item.updated_at,
          id: item.entity_id,
          owner_id: ownerId,
          updated_at: item.updated_at,
        });
      } else {
        await setDoc(
          doc(firestore, 'users', ownerId, config.collection, item.entity_id),
          firestoreData(row, ownerId),
        );
      }

      await syncRepo.markSynced(item as SyncQueueItem, ownerId);
    } catch (error) {
      await syncRepo.markFailed(item as SyncQueueItem, error);
      throw error;
    }
  }
};

const syncProfile = async (ownerId: string) => {
  const firestore = getFirestore();
  const profileRef = doc(firestore, 'users', ownerId, 'profile', 'settings');
  const [local, remoteSnapshot] = await Promise.all([syncRepo.profile(), getDoc(profileRef)]);
  const hasLocalProfile = profileFields.some(key => typeof local[key] === 'string');

  if (remoteSnapshot.exists()) {
    const remote = remoteSnapshot.data() as Record<string, unknown>;
    const remoteUpdatedAt = timestamp(remote.updated_at);
    const localUpdatedAt = timestamp(local.cloudProfileUpdatedAt);

    if (!hasLocalProfile || remoteUpdatedAt >= localUpdatedAt) {
      await syncRepo.applyRemoteProfile({
        ...remote,
        cloudProfileUpdatedAt: remoteUpdatedAt,
      });
      return true;
    }
  }

  if (hasLocalProfile) {
    const updatedAt = timestamp(local.cloudProfileUpdatedAt) || new Date().toISOString();
    const profile = Object.fromEntries(
      profileFields
        .filter(key => typeof local[key] === 'string')
        .map(key => [key, local[key]]),
    );
    await setDoc(profileRef, { ...profile, owner_id: ownerId, updated_at: updatedAt });
    await syncRepo.applyRemoteProfile({ cloudProfileUpdatedAt: updatedAt });
  }

  return false;
};

const performSync = async (ownerId: string, notifyDataChanged: boolean) => {
  emit({ error: null, pendingCount: await syncRepo.pendingCount(), status: 'syncing' });

  try {
    const entitiesChanged = await pullEntities(ownerId);
    const profileChanged = await syncProfile(ownerId);
    const totalsChanged = await syncRepo.reconcileRentCycles();
    await pushPending(ownerId);

    const syncedAt = new Date().toISOString();
    await setDoc(
      doc(getFirestore(), 'users', ownerId),
      { last_synced_at: serverTimestamp() },
      { merge: true },
    );
    emit({
      error: null,
      lastSyncedAt: syncedAt,
      pendingCount: await syncRepo.pendingCount(),
      status: 'synced',
    });
    if (notifyDataChanged && (entitiesChanged || profileChanged || totalsChanged) && activeOwnerId === ownerId) {
      callbacks.onDataChanged?.();
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cloud sync failed. Local data is safe.';
    emit({
      error: message,
      pendingCount: await syncRepo.pendingCount(),
      status: 'error',
    });
    return false;
  }
};

const schedule = () => {
  if (!activeOwnerId) return;
  if (scheduledSync) clearTimeout(scheduledSync);
  scheduledSync = setTimeout(() => {
    scheduledSync = null;
    cloudSyncService.sync();
  }, 750);
};

const onAppStateChange = (nextState: AppStateStatus) => {
  if (nextState === 'active') schedule();
};

const watchRemoteChanges = (ownerId: string) => {
  const firestore = getFirestore();
  const onRemoteChange = () => {
    if (activeOwnerId === ownerId) schedule();
  };
  const onRemoteError = (error: Error) => {
    if (activeOwnerId === ownerId) emit({ error: error.message, status: 'error' });
  };

  remoteUnsubscribers = entityTypes.map(entityType =>
    onSnapshot(
      collection(firestore, 'users', ownerId, syncEntityConfig[entityType].collection),
      onRemoteChange,
      onRemoteError,
    ),
  );
  remoteUnsubscribers.push(
    onSnapshot(
      doc(firestore, 'users', ownerId, 'profile', 'settings'),
      onRemoteChange,
      onRemoteError,
    ),
  );
};

export const cloudSyncService = {
  getState() {
    return state;
  },

  async start(ownerId: string, nextCallbacks: SyncCallbacks = {}) {
    this.stop();
    activeOwnerId = ownerId;
    callbacks = nextCallbacks;
    state = { error: null, lastSyncedAt: null, pendingCount: 0, status: 'idle' };
    callbacks.onState?.(state);
    setDatabaseWriteListener(schedule);
    appStateSubscription = AppState.addEventListener('change', onAppStateChange);
    const result = await this.sync(false);
    if (activeOwnerId === ownerId) watchRemoteChanges(ownerId);
    return result;
  },

  stop() {
    activeOwnerId = null;
    callbacks = {};
    setDatabaseWriteListener(null);
    appStateSubscription?.remove();
    appStateSubscription = null;
    remoteUnsubscribers.forEach(unsubscribe => unsubscribe());
    remoteUnsubscribers = [];
    if (scheduledSync) clearTimeout(scheduledSync);
    scheduledSync = null;
    state = { error: null, lastSyncedAt: null, pendingCount: 0, status: 'disabled' };
  },

  async sync(notifyDataChanged = true): Promise<boolean> {
    const ownerId = activeOwnerId;
    if (!ownerId) return false;

    if (syncPromise) {
      syncAgain = true;
      return syncPromise;
    }

    syncPromise = performSync(ownerId, notifyDataChanged).finally(() => {
      syncPromise = null;
      if (syncAgain && activeOwnerId) {
        syncAgain = false;
        schedule();
      }
    });
    return syncPromise;
  },
};
