const React = require('react');
const { View } = require('react-native');

const mobileAds = () => ({
  initialize: jest.fn().mockResolvedValue([]),
  setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
});

module.exports = {
  __esModule: true,
  default: mobileAds,
  AdsConsent: {
    gatherConsent: jest.fn().mockResolvedValue({ canRequestAds: true }),
  },
  BannerAd: props => React.createElement(View, props),
  BannerAdSize: {
    ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  },
  MaxAdContentRating: { PG: 'PG' },
  TestIds: { BANNER: 'test-banner' },
};
