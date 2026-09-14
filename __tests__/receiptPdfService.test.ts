const mockGeneratePDF = jest.fn();
const mockShareOpen = jest.fn();

jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: (...args: unknown[]) => mockGeneratePDF(...args),
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: (...args: unknown[]) => mockShareOpen(...args) },
}));
jest.mock('../src/database/repositories/paymentRepo', () => ({
  paymentRepo: { count: jest.fn() },
}));
jest.mock('../src/database/repositories/settingsRepo', () => ({
  settingsRepo: { getAll: jest.fn() },
}));

import { settingsRepo } from '../src/database/repositories/settingsRepo';
import { LedgerItem, Payment } from '../src/types/models';
import { receiptPdfService } from '../src/services/receiptPdfService';

describe('receiptPdfService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('generates a PDF with the package named API', async () => {
    mockGeneratePDF.mockResolvedValue({ filePath: '/tmp/receipt.pdf' });

    await expect(receiptPdfService.generate('<html />')).resolves.toBe('/tmp/receipt.pdf');
    expect(mockGeneratePDF).toHaveBeenCalledWith(expect.objectContaining({ html: '<html />' }));
  });

  test('rejects a result that has no shareable file path', async () => {
    mockGeneratePDF.mockResolvedValue({});

    await expect(receiptPdfService.generate('<html />')).rejects.toThrow('without a file path');
  });

  test('shares a local PDF through a file URL', async () => {
    mockShareOpen.mockResolvedValue({ success: true });

    await receiptPdfService.share('/tmp/receipt.pdf');

    expect(mockShareOpen).toHaveBeenCalledWith({
      failOnCancel: false,
      type: 'application/pdf',
      url: 'file:///tmp/receipt.pdf',
    });
  });
});

const receiptCycle = { id: 'cycle', tenant_name: 'Changed name', property_name: 'Changed property', unit_name: '2', month: 6, year: 2026, balance: 999 } as LedgerItem;
const receiptPayment = { id: 'pay_original', rent_cycle_id: 'cycle', amount: 500, payment_date: '2026-06-10', payment_mode: 'cash', receipt_rent: 1000, receipt_electricity: 200, receipt_balance: 700, receipt_tenant: '<Original>', receipt_property: 'Home', receipt_unit: '1', receipt_landlord: 'Owner' } as Payment;

test('receipt identity and bill snapshot remain stable when later records change', async () => {
  (settingsRepo.getAll as jest.Mock).mockResolvedValue({ landlordName: 'Changed owner' });
  const first = await receiptPdfService.buildHtml({ cycle: receiptCycle, payment: receiptPayment });
  const second = await receiptPdfService.buildHtml({ cycle: { ...receiptCycle, balance: 0, total_payable: 9000 }, payment: receiptPayment });
  expect(second).toBe(first);
  expect(first).toContain('KB-pay_original');
  expect(first).toContain('&lt;Original&gt;');
  expect(first).not.toContain('Changed');
  expect(first).toContain('700');
});

test('legacy receipts do not invent an original balance and void receipts show their reason', async () => {
  (settingsRepo.getAll as jest.Mock).mockResolvedValue({});
  const html = await receiptPdfService.buildHtml({ cycle: receiptCycle, payment: { ...receiptPayment, receipt_rent: null, voided_at: '2026-06-12', void_reason: '<Wrong amount>' } });
  expect(html).toContain('Historical receipt');
  expect(html).toContain('VOID');
  expect(html).toContain('&lt;Wrong amount&gt;');
  expect(html).not.toContain('Balance after this payment:');
});
