export const createId = (prefix = 'rk') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const createReceiptNumber = (sequence: number, year: number) =>
  `RK-${year}-${String(sequence).padStart(4, '0')}`;
