import { collection, doc, getDoc, getDocs, getFirestore, setDoc } from '@react-native-firebase/firestore';

import { syncEntityConfig, syncRepo, type SyncEntityType, type SyncQueueItem } from '../../database/repositories/syncRepo';
import { type SyncSession } from './session';

export const entityTypes = Object.keys(syncEntityConfig) as SyncEntityType[];
const profileFields = ['currency', 'landlordName', 'landlordPhone', 'onboardingDone'] as const;

const timestamp = (value: unknown) => typeof value === 'string' ? value : '';

const isRemoteNewer = (remote: Record<string, unknown>, local: Record<string, unknown>) =>
  timestamp(remote.updated_at) > timestamp(local.updated_at);

const firestoreData = (row: Record<string, unknown>, ownerId: string) =>
  Object.fromEntries(
    Object.entries({ ...row, owner_id: ownerId })
      .filter(([key, value]) => key !== 'sync_status' && value !== undefined),
  );

export const pullEntities = async (session: SyncSession) => {
  const { ownerId, run } = session;
  const firestore = getFirestore();
  let changed = false;

  // Parent records are applied first so relational data is complete before the UI refreshes.
  for (const entityType of entityTypes) {
    const config = syncEntityConfig[entityType];
    const snapshot = await run(() => getDocs(collection(firestore, 'users', ownerId, config.collection)));

    for (const document of snapshot.docs) {
      const remote = { ...document.data(), id: document.id } as Record<string, unknown>;
      if (remote.owner_id && remote.owner_id !== ownerId) continue;
      if (!timestamp(remote.updated_at)) continue;

      const local = await run(() => syncRepo.entity(entityType, document.id));
      if (!local || isRemoteNewer(remote, local)) {
        await run(() => syncRepo.applyRemoteEntity(entityType, remote, ownerId));
        changed = true;
      }
    }
  }

  return changed;
};

export const pushPending = async (session: SyncSession) => {
  const { ownerId, run } = session;
  const firestore = getFirestore();
  const pending = await run(() => syncRepo.pending());

  for (const item of pending) {
    try {
      const entityType = item.entity_type as SyncEntityType;
      const config = syncEntityConfig[entityType];
      const row = await run(() => syncRepo.entity(entityType, item.entity_id));

      if (!row) {
        // A future hard-delete can leave only its queue record. Keep a small
        // tombstone in Firestore so other devices do not recreate stale data.
        await run(() => setDoc(doc(firestore, 'users', ownerId, config.collection, item.entity_id), {
          deleted_at: item.updated_at,
          id: item.entity_id,
          owner_id: ownerId,
          updated_at: item.updated_at,
        }));
      } else {
        await run(() => setDoc(
          doc(firestore, 'users', ownerId, config.collection, item.entity_id),
          firestoreData(row, ownerId),
        ));
      }

      await run(() => syncRepo.markSynced(item as SyncQueueItem, ownerId));
    } catch (error) {
      if (!session.isActive()) throw error;
      await run(() => syncRepo.markFailed(item as SyncQueueItem, error));
      throw error;
    }
  }
};

export const syncProfile = async (session: SyncSession) => {
  const { ownerId, run } = session;
  const firestore = getFirestore();
  const profileRef = doc(firestore, 'users', ownerId, 'profile', 'settings');
  const [local, remoteSnapshot] = await run(() => Promise.all([syncRepo.profile(), getDoc(profileRef)]));
  const hasLocalProfile = profileFields.some(key => typeof local[key] === 'string');

  if (remoteSnapshot.exists()) {
    const remote = remoteSnapshot.data() as Record<string, unknown>;
    const remoteUpdatedAt = timestamp(remote.updated_at);
    const localUpdatedAt = timestamp(local.cloudProfileUpdatedAt);

    if (hasLocalProfile && remoteUpdatedAt === localUpdatedAt) return false;

    if (!hasLocalProfile || remoteUpdatedAt > localUpdatedAt) {
      await run(() => syncRepo.applyRemoteProfile({
        ...remote,
        cloudProfileUpdatedAt: remoteUpdatedAt,
      }));
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
    await run(() => setDoc(profileRef, { ...profile, owner_id: ownerId, updated_at: updatedAt }));
    await run(() => syncRepo.applyRemoteProfile({ cloudProfileUpdatedAt: updatedAt }));
  }

  return false;
};

