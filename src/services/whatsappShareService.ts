import Share from 'react-native-share';

export const whatsappShareService = {
  async shareMessage(phone: string, message: string) {
    try {
      await Share.shareSingle({
        message,
        social: Share.Social.WHATSAPP,
        whatsAppNumber: phone,
      });
    } catch {
      await Share.open({ message });
    }
  },
};
