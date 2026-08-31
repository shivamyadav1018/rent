/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/app/AppNavigator', () => ({
  AppNavigator: () => null,
}));
jest.mock('../src/database/db', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/store/appStore', () => ({
  useAppStore: (selector: (state: { bootstrap: () => Promise<void> }) => unknown) =>
    selector({ bootstrap: jest.fn().mockResolvedValue(undefined) }),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });
});
