const mockListProperties = jest.fn();
const mockListUnits = jest.fn();
const mockListTenants = jest.fn();
const mockGetSettings = jest.fn();
const mockEnsureCycles = jest.fn();
const mockLedger = jest.fn();

jest.mock('../src/database/repositories/propertyRepo', () => ({
  propertyRepo: { listWithCounts: (...args: unknown[]) => mockListProperties(...args) },
}));
jest.mock('../src/database/repositories/unitRepo', () => ({
  unitRepo: { allWithProperty: (...args: unknown[]) => mockListUnits(...args) },
}));
jest.mock('../src/database/repositories/tenantRepo', () => ({
  tenantRepo: { list: (...args: unknown[]) => mockListTenants(...args) },
}));
jest.mock('../src/database/repositories/settingsRepo', () => ({
  settingsRepo: { getAll: (...args: unknown[]) => mockGetSettings(...args) },
}));
jest.mock('../src/services/rentCycleService', () => ({
  rentCycleService: { ensureCyclesForMonth: (...args: unknown[]) => mockEnsureCycles(...args) },
}));
jest.mock('../src/database/repositories/rentRepo', () => ({
  rentRepo: { ledger: (...args: unknown[]) => mockLedger(...args) },
}));

import { useAppStore } from '../src/store/appStore';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => { resolve = next; });
  return { promise, resolve };
};

describe('app session data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetSession();
    mockGetSettings.mockResolvedValue({});
    mockListProperties.mockResolvedValue([]);
    mockListUnits.mockResolvedValue([]);
    mockListTenants.mockResolvedValue([]);
    mockEnsureCycles.mockResolvedValue(undefined);
    mockLedger.mockResolvedValue([]);
  });

  test('does not restore an in-flight refresh after the session is reset', async () => {
    const properties = deferred<Array<{ id: string }>>();
    mockListProperties.mockReturnValueOnce(properties.promise);

    const refresh = useAppStore.getState().refreshAll();
    useAppStore.getState().resetSession();
    properties.resolve([{ id: 'old-session-property' }]);

    await expect(refresh).resolves.toBe(false);
    expect(useAppStore.getState().properties).toEqual([]);
    expect(mockLedger).not.toHaveBeenCalled();
  });

  test('keeps only the newest ledger response', async () => {
    const older = deferred<Array<{ id: string }>>();
    const newer = deferred<Array<{ id: string }>>();
    mockLedger.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

    const olderRefresh = useAppStore.getState().refreshLedger(1, 2026);
    const newerRefresh = useAppStore.getState().refreshLedger(2, 2026);
    newer.resolve([{ id: 'newer-ledger' }]);
    older.resolve([{ id: 'older-ledger' }]);

    await expect(newerRefresh).resolves.toBe(true);
    await expect(olderRefresh).resolves.toBe(false);
    expect(useAppStore.getState().ledger).toEqual([{ id: 'newer-ledger' }]);
  });
});
