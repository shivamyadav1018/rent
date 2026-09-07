import React from 'react';
import Renderer, { act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]) }));
jest.mock('../src/components/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/database/repositories/rentRepo', () => ({ rentRepo: { findLedgerItem: jest.fn() } }));
jest.mock('../src/database/repositories/tenantRepo', () => ({ tenantRepo: { list: jest.fn() } }));
jest.mock('../src/services/rentCycleService', () => ({ rentCycleService: { ensureCycleForTenant: jest.fn(), recordPayment: jest.fn() } }));
const mockRefresh = jest.fn();
jest.mock('../src/store/appStore', () => ({ useAppStore: (selector: any) => selector({ refreshAll: mockRefresh }) }));

import { RecordPaymentScreen } from '../src/modules/payments/RecordPaymentScreen';
import { AppButton } from '../src/components/AppButton';
import { AppInput } from '../src/components/AppInput';
import { MonthSelector } from '../src/components/MonthSelector';
import { rentRepo } from '../src/database/repositories/rentRepo';
import { tenantRepo } from '../src/database/repositories/tenantRepo';
import { rentCycleService } from '../src/services/rentCycleService';

beforeEach(() => {
  jest.clearAllMocks();
  (tenantRepo.list as jest.Mock).mockResolvedValue([{ id: 'tenant', name: 'Test', unit_name: '1' }]);
  (rentRepo.findLedgerItem as jest.Mock).mockResolvedValue({ id: 'cycle', tenant_id: 'tenant', month: 6, year: 2026 });
  (rentCycleService.ensureCycleForTenant as jest.Mock).mockImplementation(async (_id, month, year) => ({ id: 'cycle', tenant_id: 'tenant', month, year, balance: month * 100, rent_amount: 1000 }));
  mockRefresh.mockResolvedValue(true);
});

test('opening a cycle still reloads the balance when the user changes months', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<RecordPaymentScreen navigation={{ navigate: jest.fn() }} route={{ params: { cycleId: 'cycle' } }} />); });
  expect(renderer.root.findAllByType(AppInput).find(input => input.props.label === 'Amount received')?.props.value).toBe('600');
  await act(async () => { renderer.root.findByType(MonthSelector).props.onChange(1); });
  expect(rentCycleService.ensureCycleForTenant).toHaveBeenLastCalledWith('tenant', 7, 2026);
  expect(renderer.root.findAllByType(AppInput).find(input => input.props.label === 'Amount received')?.props.value).toBe('700');
  await act(async () => renderer.unmount());
});

test('rapid save taps record once and refresh failure does not invite a duplicate payment', async () => {
  let finish!: (value: any) => void;
  (rentCycleService.recordPayment as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mockRefresh.mockRejectedValue(new Error('refresh unavailable'));
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<RecordPaymentScreen navigation={{ navigate: jest.fn() }} route={{ params: { cycleId: 'cycle' } }} />); });
  const save = renderer.root.findAllByType(AppButton).find(button => button.props.title === 'Save payment')!.props.onPress;
  await act(async () => { save(); save(); });
  expect(rentCycleService.recordPayment).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ id: 'cycle' }); });
  expect(renderer.root.findAllByType(AppButton).some(button => button.props.title === 'Generate / share receipt')).toBe(true);
  await act(async () => renderer.unmount());
});
