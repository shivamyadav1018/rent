import { Expense, ExpenseCategory } from '../../types/models';
import { nowIso } from '../../utils/dates';
import { createId } from '../../utils/ids';
import { executeSql, executeWrite } from '../db';

export const expenseRepo = {
  forProperty(propertyId: string): Promise<Expense[]> {
    return executeSql<Expense>(
      'SELECT * FROM expenses WHERE property_id = ? ORDER BY expense_date DESC',
      [propertyId],
    );
  },

  async save(input: {
    id?: string;
    property_id: string;
    amount: number;
    category: ExpenseCategory;
    description?: string;
    expense_date: string;
  }): Promise<string> {
    const timestamp = nowIso();
    const id = input.id ?? createId('exp');
    await executeWrite(
      `INSERT OR REPLACE INTO expenses
       (id, property_id, amount, category, description, expense_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM expenses WHERE id = ?), ?), ?)`,
      [
        id,
        input.property_id,
        input.amount,
        input.category,
        input.description ?? null,
        input.expense_date,
        id,
        timestamp,
        timestamp,
      ],
    );
    return id;
  },

  async delete(id: string): Promise<void> {
    await executeWrite('DELETE FROM expenses WHERE id = ?', [id]);
  },

  totalForYear(year: number): Promise<{ property_name: string; total: number }[]> {
    return executeSql<{ property_name: string; total: number }>(
      `SELECT p.name AS property_name, COALESCE(SUM(e.amount), 0) AS total
       FROM expenses e
       JOIN properties p ON p.id = e.property_id
       WHERE strftime('%Y', e.expense_date) = ?
       GROUP BY p.id, p.name
       ORDER BY p.name ASC`,
      [String(year)],
    );
  },
};
