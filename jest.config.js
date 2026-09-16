module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-google-mobile-ads$': '<rootDir>/__mocks__/react-native-google-mobile-ads.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/functions/'],
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|react-native-elements|react-native-vector-icons|react-native-ratings|react-native-size-matters)/)',
  ],
};
