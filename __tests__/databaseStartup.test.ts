jest.mock('react-native-sqlite-storage', () => ({ enablePromise: jest.fn(), openDatabase: jest.fn() }));
jest.mock('../src/database/migrations', () => ({ runMigrations: jest.fn() }));

beforeEach(() => jest.resetModules());

test('concurrent startup calls share one database open and one migration', async () => {
  const SQLite = require('react-native-sqlite-storage');
  const { runMigrations } = require('../src/database/migrations');
  const { initializeDatabase } = require('../src/database/db');
  let finish!: (db: unknown) => void;
  SQLite.openDatabase.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const first = initializeDatabase();
  const second = initializeDatabase();
  finish({ executeSql: jest.fn() });
  await Promise.all([first, second]);
  expect(SQLite.openDatabase).toHaveBeenCalledTimes(1);
  expect(runMigrations).toHaveBeenCalledTimes(1);
});

test('failed database opens can be retried', async () => {
  const SQLite = require('react-native-sqlite-storage');
  const { initializeDatabase } = require('../src/database/db');
  SQLite.openDatabase.mockRejectedValueOnce(new Error('Cannot open')).mockResolvedValueOnce({});
  await expect(initializeDatabase()).rejects.toThrow('Cannot open');
  await expect(initializeDatabase()).resolves.toBeUndefined();
  expect(SQLite.openDatabase).toHaveBeenCalledTimes(2);
});

test('batch publishes a change only after commit, and notification failure does not fail a committed save', async () => {
  const SQLite = require('react-native-sqlite-storage');
  const { executeBatch, setDatabaseWriteListener } = require('../src/database/db');
  let commit!: () => void;
  let started!: () => void;
  const batchStarted = new Promise<void>(resolve => { started = resolve; });
  const sqlBatch = jest.fn(() => new Promise<void>(resolve => { commit = resolve; started(); }));
  SQLite.openDatabase.mockResolvedValue({ sqlBatch });
  const listener = jest.fn(() => { throw new Error('sync unavailable'); });
  setDatabaseWriteListener(listener);
  const saving = executeBatch([['UPDATE payments SET amount = ?', [100]]]);
  await batchStarted;
  expect(listener).not.toHaveBeenCalled();
  commit();
  await expect(saving).resolves.toBeUndefined();
  expect(listener).toHaveBeenCalledTimes(1);
  sqlBatch.mockRejectedValueOnce(new Error('rollback'));
  await expect(executeBatch([])).rejects.toThrow('rollback');
  expect(listener).toHaveBeenCalledTimes(1);
});
