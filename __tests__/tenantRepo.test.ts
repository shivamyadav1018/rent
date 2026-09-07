jest.mock('../src/database/db', () => ({ executeSql: jest.fn(), executeWrite: jest.fn() }));
jest.mock('../src/database/repositories/unitRepo', () => ({ unitRepo: { find: jest.fn(), markVacant: jest.fn(), markOccupied: jest.fn() } }));
import { executeSql, executeWrite } from '../src/database/db';
import { unitRepo } from '../src/database/repositories/unitRepo';
import { tenantRepo } from '../src/database/repositories/tenantRepo';

const input = { id: 'tenant', unit_id: 'new-unit', name: 'Test', phone: '9876543210', monthly_rent: 1000, due_day: 5, move_in_date: '2026-01-01', security_deposit: 0 };
beforeEach(() => jest.resetAllMocks());

test('editing an inactive tenant never releases their former unit or occupies another', async () => {
  (executeSql as jest.Mock).mockResolvedValue([{ id: 'tenant', unit_id: 'old-unit', status: 'inactive' }]);
  (unitRepo.find as jest.Mock).mockResolvedValue({ id: 'new-unit', status: 'vacant' });
  await tenantRepo.save(input);
  expect(executeWrite).toHaveBeenCalledTimes(1);
  expect(unitRepo.markVacant).not.toHaveBeenCalled();
  expect(unitRepo.markOccupied).not.toHaveBeenCalled();
});

test('rejects a unit occupied by another tenant even if its cached status is vacant', async () => {
  (executeSql as jest.Mock).mockResolvedValueOnce([{ id: 'tenant', unit_id: 'old-unit', status: 'active' }]).mockResolvedValueOnce([{ id: 'other-tenant' }]);
  (unitRepo.find as jest.Mock).mockResolvedValue({ id: 'new-unit', status: 'vacant' });
  await expect(tenantRepo.save(input)).rejects.toThrow('already occupied');
  expect(executeWrite).not.toHaveBeenCalled();
  expect(unitRepo.markVacant).not.toHaveBeenCalled();
});
