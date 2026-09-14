export const createId = (prefix = 'rk') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Full persisted payment ID avoids counters colliding across offline devices.
export const receiptNumberForPayment = (paymentId: string) => `KB-${paymentId}`;

export const createReceiptNumber = (sequence: number, year: number) =>
  `KB-${year}-${String(sequence).padStart(4, '0')}`;
