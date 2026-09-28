import Share from 'react-native-share';

import { paymentRepo } from '../database/repositories/paymentRepo';

const escapeCell = (value: string | number | null | undefined): string => {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const monthName = (m: number): string =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? String(m);

export const exportService = {
  async exportPaymentsCsv(year: number): Promise<void> {
    const payments = await paymentRepo.forYear(year);

    const header = 'Date,Tenant,Property,Unit,Month,Year,Amount,Mode,Reference,Notes';
    const rows = payments.map(p =>
      [
        escapeCell(p.payment_date?.slice(0, 10)),
        escapeCell(p.tenant_name),
        escapeCell(p.property_name),
        escapeCell(p.unit_name),
        escapeCell(monthName(p.month)),
        escapeCell(p.year),
        escapeCell(p.amount),
        escapeCell(p.payment_mode?.replace('_', ' ')),
        escapeCell(p.reference_no),
        escapeCell(p.notes),
      ].join(','),
    );

    const csv = [header, ...rows].join('\n');
    // base64-encode using btoa (available in Hermes)
    // btoa is available in React Native 0.70+ (Hermes); cast to any for TS lib configs
    const b64 = (globalThis as any).btoa(unescape(encodeURIComponent(csv)));

    await Share.open({
      filename: `KirayaBahi_Payments_${year}.csv`,
      message: `KirayaBahi payment records for ${year}`,
      title: `KirayaBahi_Payments_${year}.csv`,
      type: 'text/csv',
      url: `data:text/csv;base64,${b64}`,
    } as any);
  },
};
