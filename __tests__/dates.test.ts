import { dueDateFor, isValidDate, todayDate } from '../src/utils/dates';

test.each(['2026-02-30', '2026-13-01', '2026-2-01', '2026-06-10junk', 'not a date'])('rejects invalid date %s', value => {
  expect(isValidDate(value)).toBe(false);
});
test('accepts valid leap days and clamps month-end due days', () => {
  expect(isValidDate('2024-02-29')).toBe(true);
  expect(isValidDate('2026-02-29')).toBe(false);
  expect(dueDateFor(2, 2026, 31)).toBe('2026-02-28');
});
test('today follows local calendar fields', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 5, 10, 0, 15));
  expect(todayDate()).toBe('2026-06-10');
  jest.useRealTimers();
});
