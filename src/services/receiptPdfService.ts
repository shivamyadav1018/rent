import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';

import { settingsRepo } from '../database/repositories/settingsRepo';
import { LedgerItem, Payment } from '../types/models';
import { displayDate, monthLabel } from '../utils/dates';
import { receiptNumberForPayment } from '../utils/ids';
import { formatCurrency } from '../utils/currency';

export const receiptPdfService = {
  async buildHtml(input: {
    cycle: LedgerItem;
    payment: Payment;
  }) {
    const settings = await settingsRepo.getAll();
    const { payment } = input;
    if (payment.rent_cycle_id !== input.cycle.id) throw new Error('Payment does not belong to this rent cycle');
    const receiptNumber = receiptNumberForPayment(payment.id);
    const landlordName = payment.receipt_landlord ?? settings.landlordName ?? 'Landlord';
    const rent = payment.receipt_rent;
    const electricity = payment.receipt_electricity;
    const hasSnapshot = rent != null && electricity != null && payment.receipt_balance != null;
    const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
    const row = (label: string, value: string, strong = false) => `
      <tr>
        <td style="padding: 7px 0; color: #687081;">${label}</td>
        <td style="padding: 7px 0; text-align: right; font-weight: ${strong ? '700' : '500'};">${value}</td>
      </tr>`;
    const tenantName = escape(payment.receipt_tenant ?? input.cycle.tenant_name);
    const propertyName = escape(payment.receipt_property ?? input.cycle.property_name);
    const unitName = escape(payment.receipt_unit ?? input.cycle.unit_name);
    const mode = escape(payment.payment_mode.replace('_', ' '));
    const breakdown = hasSnapshot
      ? `${row('Monthly rent', formatCurrency(rent))}
         ${row('Electricity', formatCurrency(electricity))}
         <tr><td colspan="2"><div style="border-top: 1px solid #E9EDFF; margin: 5px 0;"></div></td></tr>
         ${row('Total bill', formatCurrency(rent + electricity), true)}
         ${row(payment.receipt_balance! < 0 ? 'Advance balance' : 'Balance remaining', formatCurrency(Math.abs(payment.receipt_balance!)), true)}`
      : `<tr><td colspan="2" style="background: #FFF0D6; border-radius: 10px; color: #725000; padding: 12px;"><strong>Historical receipt</strong><br />This payment was saved before bill snapshots were introduced. Its original balance is unavailable.</td></tr>`;
    return `
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
        <body style="background: #F7F6FC; color: #151B2A; font-family: Arial, sans-serif; margin: 0; padding: 36px;">
          <div style="margin: 0 auto; max-width: 620px;">
            <div style="align-items: center; display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <div style="color: #263BAA; font-size: 11px; font-weight: 700; letter-spacing: 1.5px;">PAYMENT RECEIPT</div>
                <h1 style="font-size: 26px; margin: 5px 0 0;">KirayaBahi</h1>
              </div>
              <div style="background: ${payment.voided_at ? '#FFDAD6' : '#DDFBF1'}; border-radius: 20px; color: ${payment.voided_at ? '#BA1A1A' : '#00392B'}; font-size: 11px; font-weight: 700; padding: 9px 13px;">
                ${payment.voided_at ? 'PAYMENT VOIDED' : 'PAYMENT RECEIVED'}
              </div>
            </div>
            <div style="background: white; border: 1px solid #E9EDFF; border-radius: 20px; overflow: hidden; padding: 28px;">
              <div style="text-align: center;">
                <div style="color: #687081; font-size: 12px;">Amount received</div>
                <div style="font-size: 38px; font-weight: 800; margin: 7px 0;">${formatCurrency(payment.amount)}</div>
                <div style="color: #687081; font-size: 12px;">${displayDate(payment.payment_date)} · ${mode}</div>
              </div>
              <div style="border-top: 1px dashed #D9DEF5; margin: 24px 0;"></div>
              <div style="color: #687081; font-size: 11px;">RECEIVED FROM</div>
              <h2 style="font-size: 20px; margin: 5px 0;">${tenantName}</h2>
              <div style="color: #687081; font-size: 13px;">${propertyName} · ${unitName}</div>
              <div style="border-top: 1px dashed #D9DEF5; margin: 24px 0;"></div>
              <h3 style="font-size: 14px; margin: 0 0 8px;">Payment breakdown</h3>
              <table style="border-collapse: collapse; font-size: 13px; width: 100%;">${breakdown}</table>
              <div style="border-top: 1px dashed #D9DEF5; margin: 24px 0;"></div>
              <table style="border-collapse: collapse; font-size: 13px; width: 100%;">
                ${row('Rent period', monthLabel(input.cycle.month, input.cycle.year))}
                ${row('Landlord', escape(landlordName))}
                ${row('Reference', escape(payment.reference_no || 'Not provided'))}
                ${payment.notes ? row('Note', escape(payment.notes)) : ''}
              </table>
              <div style="background: #F1F3FF; border-radius: 12px; margin-top: 22px; padding: 14px; text-align: center;">
                <div style="color: #263BAA; font-size: 9px; font-weight: 700; letter-spacing: 1.4px;">RECEIPT NUMBER</div>
                <div style="color: #001F94; font-size: 11px; font-weight: 700; margin-top: 4px; overflow-wrap: anywhere;">${escape(receiptNumber)}</div>
              </div>
              ${payment.voided_at ? `<div style="background: #FFDAD6; border-radius: 12px; color: #BA1A1A; margin-top: 18px; padding: 14px;"><strong>This receipt is void</strong><br /><span style="font-size: 12px;">${escape(payment.void_reason ?? 'No reason provided')} · ${displayDate(payment.voided_at)}</span></div>` : ''}
            </div>
            <p style="color: #687081; font-size: 11px; text-align: center;">Recorded securely with KirayaBahi</p>
          </div>
        </body>
      </html>
    `;
  },

  async generate(html: string) {
    const pdf = await generatePDF({
      fileName: `rent-khata-receipt-${Date.now()}`,
      html,
    });

    if (!pdf.filePath) {
      throw new Error('The PDF was generated without a file path.');
    }

    return pdf.filePath;
  },

  async share(filePath: string) {
    const url = filePath.startsWith('file://') || filePath.startsWith('content://')
      ? filePath
      : `file://${filePath}`;

    await Share.open({ failOnCancel: false, type: 'application/pdf', url });
  },

  async generateAndShare(html: string) {
    const filePath = await this.generate(html);
    if (filePath) await this.share(filePath);
    return filePath;
  },
};
