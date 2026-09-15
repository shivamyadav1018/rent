import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import type { TenantInviteListItem } from '../database/repositories/tenantInviteRepo';

export type PublicTenantInvite = {
  code: string;
  expires_at: string;
  expires_at_ms: number;
  invite_id: string;
  owner_id: string;
  property_id: string;
  property_name: string;
  status: 'active' | 'cancelled' | 'expired' | 'used';
  unit_id: string;
  unit_name: string;
};

export type TenantApplicationStatus = 'submitted' | 'approved' | 'rejected';

export type TenantApplication = {
  id: string;
  applicant_id: string;
  current_address: string;
  invite_code: string;
  invite_id: string;
  move_in_date: string;
  owner_id: string;
  phone: string;
  property_id: string;
  property_name: string;
  status: TenantApplicationStatus;
  submitted_at: string;
  tenant_id?: string | null;
  tenant_name: string;
  unit_id: string;
  unit_name: string;
  updated_at: string;
};

const cleanCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
// One deterministic document per invite makes duplicate submissions impossible
// even if the code is opened on more than one device.
const applicationId = (inviteId: string) => inviteId;

const asInvite = (id: string, data: Record<string, unknown>): PublicTenantInvite => ({
  ...(data as Omit<PublicTenantInvite, 'code'>),
  code: id,
});

const assertActive = (invite: PublicTenantInvite) => {
  if (invite.status !== 'active') throw new Error('This invite is no longer active. Ask the owner for a new code.');
  if (invite.expires_at_ms <= Date.now()) throw new Error('This invite has expired. Ask the owner for a new code.');
};

export const tenantApplicationService = {
  normaliseCode: cleanCode,

  async publishInvite(ownerId: string, invite: TenantInviteListItem) {
    if (!ownerId) throw new Error('The owner must be signed in to create a tenant invite.');
    const code = cleanCode(invite.code);
    const expiresAtMs = new Date(invite.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs)) throw new Error('Invite expiry is invalid.');
    await setDoc(doc(getFirestore(), 'tenantInviteCodes', code), {
      code,
      created_at: invite.created_at,
      expires_at: invite.expires_at,
      expires_at_ms: expiresAtMs,
      invite_id: invite.id,
      owner_id: ownerId,
      property_id: invite.property_id,
      property_name: invite.property_name,
      status: invite.status,
      unit_id: invite.unit_id,
      unit_name: invite.unit_name,
      updated_at: invite.updated_at,
    });
  },

  async lookupInvite(value: string) {
    const code = cleanCode(value);
    if (code.length !== 6) throw new Error('Enter the complete 6-character invite code.');
    const snapshot = await getDocFromServer(doc(getFirestore(), 'tenantInviteCodes', code));
    if (!snapshot.exists()) throw new Error('Invite code not found. Check the code and try again.');
    const invite = asInvite(snapshot.id, snapshot.data() as Record<string, unknown>);
    assertActive(invite);
    return invite;
  },

  async cancelPublishedInvite(ownerId: string, value: string) {
    const reference = doc(getFirestore(), 'tenantInviteCodes', cleanCode(value));
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return;
    if (snapshot.data()?.owner_id !== ownerId) throw new Error('You cannot cancel this invite.');
    await updateDoc(reference, { status: 'cancelled', updated_at: new Date().toISOString() });
  },

  async submit(invite: PublicTenantInvite, applicantId: string, input: {
    current_address: string;
    move_in_date: string;
    phone: string;
    tenant_name: string;
  }) {
    assertActive(invite);
    const timestamp = new Date().toISOString();
    const id = applicationId(invite.invite_id);
    const application: TenantApplication = {
      id,
      applicant_id: applicantId,
      current_address: input.current_address.trim(),
      invite_code: invite.code,
      invite_id: invite.invite_id,
      move_in_date: input.move_in_date,
      owner_id: invite.owner_id,
      phone: input.phone.replace(/\D/g, ''),
      property_id: invite.property_id,
      property_name: invite.property_name,
      status: 'submitted',
      submitted_at: timestamp,
      tenant_name: input.tenant_name.trim(),
      unit_id: invite.unit_id,
      unit_name: invite.unit_name,
      updated_at: timestamp,
    };
    await setDoc(doc(getFirestore(), 'tenantApplications', id), application);
    return application;
  },

  async mine(applicantId: string) {
    const snapshot = await getDocs(query(
      collection(getFirestore(), 'tenantApplications'),
      where('applicant_id', '==', applicantId),
    ));
    return snapshot.docs
      .map(item => ({ ...item.data(), id: item.id }) as TenantApplication)
      .sort((left, right) => right.submitted_at.localeCompare(left.submitted_at));
  },

  async forOwner(ownerId: string) {
    const snapshot = await getDocs(query(
      collection(getFirestore(), 'tenantApplications'),
      where('owner_id', '==', ownerId),
    ));
    return snapshot.docs
      .map(item => ({ ...item.data(), id: item.id }) as TenantApplication)
      .sort((left, right) => right.submitted_at.localeCompare(left.submitted_at));
  },

  async find(id: string) {
    const snapshot = await getDoc(doc(getFirestore(), 'tenantApplications', id));
    return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as TenantApplication) : null;
  },

  reject(id: string, ownerId: string) {
    return updateDoc(doc(getFirestore(), 'tenantApplications', id), {
      reviewed_at: new Date().toISOString(),
      reviewed_by: ownerId,
      status: 'rejected',
      updated_at: new Date().toISOString(),
    });
  },

  async approve(input: {
    applicationId: string;
    dueDay: number;
    monthlyRent: number;
    ownerId: string;
    securityDeposit: number;
  }) {
    const firestore = getFirestore();
    const appRef = doc(firestore, 'tenantApplications', input.applicationId);
    return runTransaction(firestore, async transaction => {
      const appSnapshot = await transaction.get(appRef);
      if (!appSnapshot.exists()) throw new Error('This application no longer exists.');
      const application = { ...appSnapshot.data(), id: appSnapshot.id } as TenantApplication;
      if (application.owner_id !== input.ownerId) throw new Error('You cannot approve this application.');
      if (application.status !== 'submitted') throw new Error('This application has already been reviewed.');

      const codeRef = doc(firestore, 'tenantInviteCodes', application.invite_code);
      const unitRef = doc(firestore, 'users', input.ownerId, 'units', application.unit_id);
      const privateInviteRef = doc(firestore, 'users', input.ownerId, 'tenantInvites', application.invite_id);
      const codeSnapshot = await transaction.get(codeRef);
      const unitSnapshot = await transaction.get(unitRef);
      const inviteSnapshot = await transaction.get(privateInviteRef);
      if (!codeSnapshot.exists() || codeSnapshot.data()?.status !== 'active') throw new Error('The invite is no longer active.');
      if (Number(codeSnapshot.data()?.expires_at_ms) <= Date.now()) throw new Error('The invite has expired. Create a new invite.');
      if (!unitSnapshot.exists() || unitSnapshot.data()?.status !== 'vacant') throw new Error('The selected unit is no longer vacant.');
      if (!inviteSnapshot.exists() || inviteSnapshot.data()?.status !== 'active') throw new Error('The private invite is not ready. Sync and try again.');

      const timestamp = new Date().toISOString();
      const tenantId = `tenant_${application.id}`;
      const tenantRef = doc(firestore, 'users', input.ownerId, 'tenants', tenantId);
      transaction.set(tenantRef, {
        created_at: timestamp,
        deleted_at: null,
        due_day: input.dueDay,
        electricity_amount: 0,
        id: tenantId,
        id_proof_mime_type: null,
        id_proof_name: null,
        id_proof_storage_path: null,
        monthly_rent: input.monthlyRent,
        move_in_date: application.move_in_date,
        name: application.tenant_name,
        notes: `Submitted through tenant invite. Current address: ${application.current_address}`,
        owner_id: input.ownerId,
        phone: application.phone,
        security_deposit: input.securityDeposit,
        status: 'active',
        unit_id: application.unit_id,
        updated_at: timestamp,
        version: 1,
      });
      transaction.update(unitRef, { status: 'occupied', updated_at: timestamp, version: Number(unitSnapshot.data()?.version ?? 0) + 1 });
      transaction.update(privateInviteRef, { status: 'used', updated_at: timestamp, version: Number(inviteSnapshot.data()?.version ?? 0) + 1 });
      transaction.update(codeRef, { status: 'used', updated_at: timestamp });
      transaction.update(appRef, { reviewed_at: timestamp, reviewed_by: input.ownerId, status: 'approved', tenant_id: tenantId, updated_at: timestamp });
      return tenantId;
    });
  },
};
