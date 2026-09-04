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
