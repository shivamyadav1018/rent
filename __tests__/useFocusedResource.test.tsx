import React from 'react';
import Renderer, { act } from 'react-test-renderer';
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]) }));
import { useFocusedResource } from '../src/hooks/useFocusedResource';

let resource: ReturnType<typeof useFocusedResource<string>>;
function Harness({ load }: { load: () => Promise<string> }) {
  resource = useFocusedResource(load);
  return null;
}

test('failed reads expose an error and can be retried', async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error('Read failed')).mockResolvedValueOnce('loaded');
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<Harness load={load} />); });
  expect(resource).toMatchObject({ loading: false, error: 'Read failed', data: null });
  await act(async () => resource.retry());
  expect(resource).toMatchObject({ loading: false, error: '', data: 'loaded' });
  await act(async () => renderer.unmount());
});

test('an older lookup cannot replace the selected record', async () => {
  let finish!: (value: string) => void;
  const oldLoad = () => new Promise<string>(resolve => { finish = resolve; });
  const newLoad = async () => 'new';
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => { renderer = Renderer.create(<Harness load={oldLoad} />); });
  await act(async () => renderer.update(<Harness load={newLoad} />));
  await act(async () => finish('old'));
  expect(resource.data).toBe('new');
  await act(async () => renderer.unmount());
});
