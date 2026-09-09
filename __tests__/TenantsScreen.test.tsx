import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Card } from '../src/components/Card';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]) }));
jest.mock('../src/components/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/BrandHeader', () => ({ BrandHeader: () => null, initials: (name: string) => name[0] }));
const mockRefresh = jest.fn().mockResolvedValue(true);
const mockState = {
  refreshAll: mockRefresh,
  tenants: [
    { id: 'a', name: 'Amit', phone: '9876543210', property_name: 'Lake House', unit_name: 'Flat 101', monthly_rent: 15000, electricity_amount: 0 },
    { id: 'b', name: 'Priya', phone: '9123456780', property_name: 'Market', unit_name: 'Shop 3', monthly_rent: 12000, electricity_amount: 0 },
  ],
  dashboardLedger: [
    { id: 'cycle-a', tenant_id: 'a', status: 'overdue', balance: 15000 },
    { id: 'cycle-b', tenant_id: 'b', status: 'partial', balance: 6000 },
  ],
};
jest.mock('../src/store/appStore', () => ({ useAppStore: (selector: any) => selector(mockState) }));

import { TenantsScreen } from '../src/modules/tenants/TenantsScreen';
import { AppInput } from '../src/components/AppInput';
import { AppChip } from '../src/components/AppChip';
import { AppButton } from '../src/components/AppButton';

const tenantCards = (renderer: Renderer.ReactTestRenderer) => renderer.root.findAllByType(Card);

test('unit search and payment status filters combine without losing other tenants', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<TenantsScreen navigation={{ navigate: jest.fn() }} />); });
  expect(tenantCards(renderer)).toHaveLength(2);
  await act(async () => renderer.root.findByType(AppInput).props.onChangeText('Shop 3'));
  expect(tenantCards(renderer)).toHaveLength(1);
  expect(JSON.stringify(renderer.toJSON())).toContain('Priya');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Amit');
  await act(async () => renderer.root.findAllByType(AppChip).find(node => node.props.label.startsWith('OVERDUE'))!.props.onPress());
  expect(tenantCards(renderer)).toHaveLength(0);
  await act(async () => renderer.root.findByType(AppInput).props.onChangeText(''));
  expect(tenantCards(renderer)).toHaveLength(1);
  expect(JSON.stringify(renderer.toJSON())).toContain('Amit');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Priya');
  await act(async () => renderer.unmount());
});

test('reminders and partial collections target the real current rent cycle', async () => {
  const navigate = jest.fn();
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<TenantsScreen navigation={{ navigate }} />); });
  await act(async () => renderer.root.findAllByType(AppButton).find(node => node.props.title === 'Send WhatsApp Reminder')!.props.onPress());
  expect(navigate).toHaveBeenLastCalledWith('ReminderPreview', { cycleId: 'cycle-a' });
  await act(async () => renderer.root.findAllByType(AppButton).find(node => node.props.title.startsWith('Collect '))!.props.onPress());
  expect(navigate).toHaveBeenLastCalledWith('RecordPayment', { tenantId: 'b', cycleId: 'cycle-b' });
  await act(async () => renderer.unmount());
});
