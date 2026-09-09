module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/functions/'],
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|react-native-elements|react-native-vector-icons|react-native-ratings|react-native-size-matters)/)',
  ],
};
