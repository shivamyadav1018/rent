import { TestIds } from 'react-native-google-mobile-ads';

// Keep test inventory enabled until production AdMob units are configured.
export const adConfig = {
  appOpenUnitId: TestIds.APP_OPEN,
  bannerUnitId: TestIds.BANNER,
  interstitialUnitId: TestIds.INTERSTITIAL,
  rewardedUnitId: TestIds.REWARDED,
} as const;
