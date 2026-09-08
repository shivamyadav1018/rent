jest.mock('@react-native-firebase/app', () => ({ getApps: jest.fn() }));
import { getApps } from '@react-native-firebase/app';

test.each([
  [[], false],
  [[{ name: 'secondary' }], false],
  [[{ name: '[DEFAULT]' }], true],
])('requires a native default Firebase app: %j', (apps, expected) => {
  (getApps as jest.Mock).mockReturnValue(apps);
  jest.isolateModules(() => {
    expect(require('../src/config/firebase').isFirebaseConfigured).toBe(expected);
  });
});
