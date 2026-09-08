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
