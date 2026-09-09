'use strict';

const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { logger } = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const { dateInTimeZone, daysBetween, dueDateFor, notificationFor, reminderKind } = require('./reminderLogic');

initializeApp();

const TIME_ZONE = 'Asia/Kolkata';
const asNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

const tenantLocation = async (userRef, tenant) => {
  const unitSnapshot = tenant.unit_id ? await userRef.collection('units').doc(tenant.unit_id).get() : null;
  const unit = unitSnapshot?.data() ?? {};
  const propertySnapshot = unit.property_id ? await userRef.collection('properties').doc(unit.property_id).get() : null;
  return { property_name: propertySnapshot?.data()?.name ?? '', unit_name: unit.name ?? '' };
};

const ensureCurrentCycles = async (userRef, ownerId, tenants, today) => {
  const [year, month] = today.split('-').map(Number);
  const currentMonth = today.slice(0, 7);
  for (const tenantDocument of tenants.docs) {
    const tenant = tenantDocument.data();
    if (tenant.deleted_at || tenant.status !== 'active' || String(tenant.move_in_date ?? '').slice(0, 7) > currentMonth) continue;
    const cycleId = `cycle_${tenantDocument.id}_${year}_${String(month).padStart(2, '0')}`;
    const cycleRef = userRef.collection('rentCycles').doc(cycleId);
    if ((await cycleRef.get()).exists) continue;
    const rentAmount = asNumber(tenant.monthly_rent);
    const electricityAmount = asNumber(tenant.electricity_amount);
    const totalPayable = rentAmount + electricityAmount;
    const dueDate = dueDateFor(month, year, asNumber(tenant.due_day) || 1);
    const timestamp = new Date().toISOString();
    await cycleRef.create({
      balance: totalPayable,
      created_at: timestamp,
      deleted_at: null,
      due_date: dueDate,
      electricity_amount: electricityAmount,
      id: cycleId,
      month,
      owner_id: ownerId,
      rent_amount: rentAmount,
      status: daysBetween(today, dueDate) < 0 ? 'overdue' : 'unpaid',
      tenant_id: tenantDocument.id,
      total_paid: 0,
      total_payable: totalPayable,
      updated_at: timestamp,
      version: 1,
      year,
    }).catch(error => {
      if (error.code !== 6 && error.code !== 'already-exists') throw error;
    });
  }
};

const sendToOwner = async (userRef, cycleDocument, cycle, tenant, devices, today) => {
  const daysUntilDue = daysBetween(today, cycle.due_date);
  const kind = reminderKind(daysUntilDue);
  if (!kind || asNumber(cycle.balance) <= 0) return 0;
  const deliveryRef = userRef.collection('reminderDeliveries').doc(`${cycleDocument.id}_${today}_${kind}`);
  const tokens = devices.docs
    .filter(device => device.data().enabled !== false && typeof device.data().token === 'string')
    .map(device => ({ ref: device.ref, token: device.data().token }));
  if (tokens.length === 0) return 0;

  try {
    await deliveryRef.create({
      cycle_id: cycleDocument.id,
      created_at: FieldValue.serverTimestamp(),
      kind,
      status: 'sending',
      tenant_id: cycle.tenant_id,
    });
  } catch (error) {
    if (error.code === 6 || error.code === 'already-exists') return 0;
    throw error;
  }

  try {
    const notification = notificationFor({ cycle, daysUntilDue, tenant });
    let successes = 0;
    for (let offset = 0; offset < tokens.length; offset += 500) {
      const group = tokens.slice(offset, offset + 500);
      const response = await getMessaging().sendEachForMulticast({
        android: { notification: { channelId: 'rent-reminders' }, priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
        data: { cycleId: cycleDocument.id, reminderKind: kind, tenantId: String(cycle.tenant_id) },
        notification,
        tokens: group.map(item => item.token),
      });
      successes += response.successCount;
      const invalidDeletes = response.responses.flatMap((result, index) => {
        const code = result.error?.code;
        return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token'
          ? [group[index].ref.delete()]
          : [];
      });
      await Promise.all(invalidDeletes);
    }

    if (successes > 0) {
      await deliveryRef.set({ sent_at: FieldValue.serverTimestamp(), status: 'sent' }, { merge: true });
    } else {
      await deliveryRef.delete();
    }
    return successes;
  } catch (error) {
    await deliveryRef.delete().catch(() => undefined);
    throw error;
  }
};

exports.sendScheduledRentReminders = onSchedule(
  { memory: '256MiB', region: 'asia-south1', schedule: '0 9 * * *', timeZone: TIME_ZONE },
  async () => {
    const db = getFirestore();
    const today = dateInTimeZone(new Date(), TIME_ZONE);
    const [year, month] = today.split('-').map(Number);
    const users = await db.collection('users').get();
    let notificationCount = 0;

    for (const userDocument of users.docs) {
      const userRef = userDocument.ref;
      const [tenants, devices] = await Promise.all([
        userRef.collection('tenants').get(),
        userRef.collection('devices').get(),
      ]);
      if (devices.empty) continue;
      await ensureCurrentCycles(userRef, userDocument.id, tenants, today);
      const cycles = await userRef.collection('rentCycles').where('month', '==', month).where('year', '==', year).get();
      const tenantMap = new Map(tenants.docs.map(document => [document.id, document.data()]));

      for (const cycleDocument of cycles.docs) {
        const cycle = cycleDocument.data();
        if (cycle.deleted_at || asNumber(cycle.balance) <= 0) continue;
        const tenantData = tenantMap.get(cycle.tenant_id);
        if (!tenantData || tenantData.deleted_at) continue;
        const location = await tenantLocation(userRef, tenantData);
        notificationCount += await sendToOwner(
          userRef,
          cycleDocument,
          cycle,
          { ...tenantData, ...location, name: tenantData.name || 'Tenant' },
          devices,
          today,
        );
      }
    }
    logger.info('Scheduled rent reminders complete', { notificationCount, today, users: users.size });
  },
);
