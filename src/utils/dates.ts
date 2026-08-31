import { format, isBefore, startOfDay } from 'date-fns';

export const nowIso = () => new Date().toISOString();

export const currentMonthYear = () => {
  const today = new Date();
  return { month: today.getMonth() + 1, year: today.getFullYear() };
};

export const monthLabel = (month: number, year: number) =>
  format(new Date(year, month - 1, 1), 'MMMM yyyy');

export const dueDateFor = (month: number, year: number, dueDay: number) => {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(dueDay, 1), lastDay);
  return new Date(year, month - 1, day).toISOString();
};

export const isPastDue = (isoDate: string) =>
  isBefore(startOfDay(new Date(isoDate)), startOfDay(new Date()));

export const displayDate = (isoDate?: string | null) =>
  isoDate ? format(new Date(isoDate), 'dd MMM yyyy') : '-';
