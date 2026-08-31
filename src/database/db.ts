import SQLite from 'react-native-sqlite-storage';

import { runMigrations } from './migrations';

SQLite.enablePromise(true);

let database: any;

export const getDb = async () => {
  if (!database) {
    database = await SQLite.openDatabase({ location: 'default', name: 'rent_khata.db' });
  }
  return database;
};

export const initializeDatabase = async () => {
  const db = await getDb();
  await runMigrations(db);
};

export const executeSql = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  const db = await getDb();
  const [result] = await db.executeSql(sql, params);
  const rows: T[] = [];

  for (let index = 0; index < result.rows.length; index += 1) {
    rows.push(result.rows.item(index));
  }

  return rows;
};

export const executeWrite = async (sql: string, params: any[] = []) => {
  const db = await getDb();
  await db.executeSql(sql, params);
};
