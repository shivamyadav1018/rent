'use strict';

const dateInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit', month: '2-digit', timeZone, year: 'numeric',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const daysBetween = (fromIso, toIso) => {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86400000);
};

const dueDateFor = (month, year, dueDay) => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const normalizedDay = Math.trunc(Number(dueDay) || 1);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(Math.max(normalizedDay, 1), lastDay)).padStart(2, '0')}`;
};

const reminderKind = daysUntilDue => {
  if (daysUntilDue === 3) return 'before_due';
  if (daysUntilDue === 0) return 'due_today';
  const daysOverdue = -daysUntilDue;
  if (daysOverdue === 1 || (daysOverdue > 1 && daysOverdue % 3 === 0)) return 'overdue';
  return null;
};

const money = amount => new Intl.NumberFormat('en-IN', {
  currency: 'INR', maximumFractionDigits: 0, style: 'currency',
}).format(Number(amount) || 0);

const notificationFor = ({ cycle, daysUntilDue, tenant }) => {
  const room = [tenant.property_name, tenant.unit_name].filter(Boolean).join(' / ');
  const location = room ? ` · ${room}` : '';
  if (daysUntilDue === 3) return {
    body: `${tenant.name}'s ${money(cycle.balance)} payment is due on ${cycle.due_date}${location}.`,
    title: 'Rent due in 3 days',
  };
  if (daysUntilDue === 0) return {
    body: `Collect ${money(cycle.balance)} from ${tenant.name} today${location}.`,
    title: 'Rent due today',
  };
  return {
    body: `${tenant.name} is ${-daysUntilDue} day${daysUntilDue === -1 ? '' : 's'} overdue. ${money(cycle.balance)} remains${location}.`,
    title: 'Rent payment overdue',
  };
};

module.exports = { dateInTimeZone, daysBetween, dueDateFor, notificationFor, reminderKind };
