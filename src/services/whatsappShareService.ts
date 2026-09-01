import Share from 'react-native-share';

// Normalise phone for WhatsApp: requires international format without '+'.
// Defaults to India (+91) if the number looks like a 10-digit local number.
const normalisePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;          // prepend India country code
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `91${digits.slice(1)}`; // 0-prefixed Indian number
  }
  return digits;                   // already includes country code
};

export const whatsappShareService = {
  async shareMessage(phone: string, message: string) {
    try {
      await Share.shareSingle({
        message,
        social: Share.Social.WHATSAPP,
        whatsAppNumber: normalisePhone(phone),
      });
    } catch {
      await Share.open({ message });
    }
  },
};
