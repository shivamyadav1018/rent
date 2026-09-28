import { executeSql, executeWrite } from '../db';
import type { Locale } from '../../utils/i18n';

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
  },

  async setMany(values: Record<string, string>) {
    await Promise.all(Object.entries(values).map(([key, value]) => this.set(key, value)));
  },

  // Improvement 7: UPI VPA
  async getUpiVpa(): Promise<string | null> {
    return this.get('upiVpa');
  },

  async setUpiVpa(vpa: string): Promise<void> {
    return this.set('upiVpa', vpa);
  },

  // Improvement 14: language
  async getLanguage(): Promise<Locale> {
    const lang = await this.get('language');
    return (lang === 'hi' ? 'hi' : 'en') as Locale;
  },

  async setLanguage(locale: Locale): Promise<void> {
    return this.set('language', locale);
  },
};
