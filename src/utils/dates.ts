import { format, isBefore, parseISO, startOfDay } from 'date-fns';

export const nowIso = () => new Date().toISOString();

export const currentMonthYear = () => {
  const today = new Date();
  return { month: today.getMonth() + 1, year: today.getFullYear() };
};

export const monthLabel = (month: number, year: number) =>
  format(new Date(year, month - 1, 1), 'MMMM yyyy');

/**
 * Returns a plain ISO date string (YYYY-MM-DD) for the due date.
 * Stored as date-only to avoid UTC/IST midnight drift issues.
 */
export const dueDateFor = (month: number, year: number, dueDay: number): string => {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(dueDay, 1), lastDay);
  return format(new Date(year, month - 1, day), 'yyyy-MM-dd');
};

/**
 * Checks if a stored due date (YYYY-MM-DD or ISO string) is in the past.
 * Compares calendar days in local timezone to avoid UTC midnight issues.
 */
export const isPastDue = (isoDate: string): boolean => {
  // Support both 'YYYY-MM-DD' and full ISO strings
  const dateStr = isoDate.slice(0, 10);
  const [y, m, d] = dateStr.split('-').map(Number);
  return isBefore(startOfDay(new Date(y, m - 1, d)), startOfDay(new Date()));
};

export const displayDate = (isoDate?: string | null) =>
  isoDate ? format(parseISO(isoDate.slice(0, 10)), 'dd MMM yyyy') : '-';
