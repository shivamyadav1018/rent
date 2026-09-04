import { executeSql, executeWrite } from '../db';

const cloudProfileKeys = new Set(['currency', 'landlordName', 'landlordPhone', 'onboardingDone']);

export const settingsRepo = {
  async get(key: string) {
    const rows = await executeSql<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return rows[0]?.value ?? null;
  },

  async getAll() {
    const rows = await executeSql<{ key: string; value: string }>('SELECT key, value FROM settings');
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  },

  async set(key: string, value: string) {
    await executeWrite('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    if (cloudProfileKeys.has(key)) {
      await executeWrite(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['cloudProfileUpdatedAt', new Date().toISOString()],
      );
    }
  },

  async setMany(values: Record<string, string>) {
    await Promise.all(Object.entries(values).map(([key, value]) => this.set(key, value)));
  },
};
