import React from 'react';
import Renderer, { act } from 'react-test-renderer';

const mockUnsubscribe = jest.fn();
const mockInitialize = jest.fn(() => mockUnsubscribe);
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../src/app/AppNavigator', () => ({ AppNavigator: () => null }));
jest.mock('../src/database/db', () => ({ initializeDatabase: jest.fn() }));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { initialize: typeof mockInitialize }) => unknown) =>
    selector({ initialize: mockInitialize }),
}));

import App from '../App';
import { AppButton } from '../src/components/AppButton';
import { AppNavigator } from '../src/app/AppNavigator';
import { initializeDatabase } from '../src/database/db';

beforeEach(() => {
  jest.clearAllMocks();
  (initializeDatabase as jest.Mock).mockResolvedValue(undefined);
});

test('starts once and removes the auth subscription on unmount', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<App />); });
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(1);
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
});

test('shows a retry action after database startup fails', async () => {
  (initializeDatabase as jest.Mock).mockRejectedValueOnce(new Error('Database unavailable'));
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<App />); });
  expect(mockInitialize).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(0);
  await act(async () => { renderer.root.findByType(AppButton).props.onPress(); });
  expect(renderer.root.findAllByType(AppNavigator)).toHaveLength(1);
  await act(async () => renderer.unmount());
});

test('does not start auth if unmounted while the database opens', async () => {
  let finish!: () => void;
  (initializeDatabase as jest.Mock).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<App />); });
  await act(async () => renderer.unmount());
  await act(async () => finish());
  expect(mockInitialize).not.toHaveBeenCalled();
});
