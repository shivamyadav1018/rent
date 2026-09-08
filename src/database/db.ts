import SQLite from 'react-native-sqlite-storage';

import { runMigrations } from './migrations';

SQLite.enablePromise(true);

let database: any;
let opening: Promise<any> | null = null;
let initializing: Promise<void> | null = null;
let writeListener: (() => void) | null = null;

export const setDatabaseWriteListener = (listener: (() => void) | null) => {
  writeListener = listener;
};

export const getDb = async () => {
  if (!database) {
    if (!opening) {
      opening = SQLite.openDatabase({ location: 'default', name: 'rent_khata.db' })
        .then((db: any) => { database = db; return db; })
        .finally(() => { opening = null; });
    }
    return opening;
  }
  return database;
};

export const initializeDatabase = () => {
  if (!initializing) {
    initializing = getDb().then(runMigrations).finally(() => { initializing = null; });
  }
  return initializing;
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
  writeListener?.();
};
