import mobileAds, {
  AdsConsent,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';

let initialization: Promise<boolean> | null = null;

async function initialize(): Promise<boolean> {
  try {
    const consent = await AdsConsent.gatherConsent({
      tagForUnderAgeOfConsent: false,
    });
    if (!consent.canRequestAds) return false;
  } catch {
    return false;
  }

  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    testDeviceIdentifiers: ['EMULATOR'],
  });
  await mobileAds().initialize();
  return true;
}

export const adMobService = {
  initialize(): Promise<boolean> {
    if (!initialization) {
      initialization = initialize().catch(error => {
        initialization = null;
        throw error;
      });
    }
    return initialization;
  },
};
