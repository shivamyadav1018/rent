'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { dateInTimeZone, daysBetween, dueDateFor, notificationFor, reminderKind } = require('./reminderLogic');

test('clamps rent due dates to the final day of short months', () => {
  assert.equal(dueDateFor(2, 2027, 31), '2027-02-28');
  assert.equal(dueDateFor(2, 2028, 31), '2028-02-29');
});

test('selects before-due, due-day, and recurring overdue reminders', () => {
  assert.equal(reminderKind(3), 'before_due');
  assert.equal(reminderKind(0), 'due_today');
  assert.equal(reminderKind(-1), 'overdue');
  assert.equal(reminderKind(-2), null);
  assert.equal(reminderKind(-3), 'overdue');
});

test('uses calendar days and the configured timezone', () => {
  assert.equal(daysBetween('2026-09-08', '2026-09-11'), 3);
  assert.equal(dateInTimeZone(new Date('2026-09-08T20:00:00Z'), 'Asia/Kolkata'), '2026-09-09');
});

test('owner notification names the tenant and outstanding balance', () => {
  const notification = notificationFor({
    cycle: { balance: 9200, due_date: '2026-09-08' },
    daysUntilDue: 0,
    tenant: { name: 'Anita', property_name: 'Sunrise', unit_name: 'Room 2' },
  });
  assert.match(notification.body, /Anita/);
  assert.match(notification.body, /9,200/);
  assert.match(notification.body, /Room 2/);
});
