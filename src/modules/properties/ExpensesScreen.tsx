import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { expenseRepo } from '../../database/repositories/expenseRepo';
import { Expense, ExpenseCategory } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { colors, fontFamily } from '../../theme';

const CATEGORIES: ExpenseCategory[] = ['repair', 'maintenance', 'cleaning', 'tax', 'insurance', 'other'];

export function ExpensesScreen({ route }: any) {
  const propertyId = route.params.propertyId as string;
  const propertyName = route.params.propertyName as string | undefined;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    expenseRepo.forProperty(propertyId).then(setExpenses).catch(() => undefined);
  }, [propertyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveExpense = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert('Enter a valid amount');
    setSaving(true);
    try {
      await expenseRepo.save({ property_id: propertyId, amount: amt, category, description, expense_date: expenseDate });
      setAmount(''); setDescription(''); setCategory('other'); setShowAdd(false);
      load();
    } catch (error) {
      Alert.alert('Could not save expense', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };

  const deleteExpense = (id: string) => {
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await expenseRepo.delete(id); load(); } },
    ]);
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Screen>
      <Title>Expenses</Title>
      {propertyName ? <Muted>{propertyName}</Muted> : null}
      {total > 0 ? <Body style={styles.total}>Total: {formatCurrency(total)}</Body> : null}
      <AppButton title={showAdd ? 'Cancel' : 'Add Expense'} variant={showAdd ? 'secondary' : 'primary'} onPress={() => setShowAdd(v => !v)} />
      {showAdd ? (
        <Card>
          <AppInput label="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
          <AppInput label="Date (YYYY-MM-DD)" value={expenseDate} onChangeText={setExpenseDate} />
          <AppInput label="Description (optional)" value={description} onChangeText={setDescription} />
          <Body style={styles.label}>Category</Body>
          <View style={styles.cats}>
            {CATEGORIES.map(cat => (
              <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.cat, category === cat && styles.catSelected]}>
                <Body style={[styles.catText, category === cat && styles.catTextSelected]}>{cat}</Body>
              </Pressable>
            ))}
          </View>
          <AppButton title={saving ? 'Saving...' : 'Save Expense'} onPress={saveExpense} />
        </Card>
      ) : null}
      {expenses.length === 0 ? <Muted>No expenses recorded for this property.</Muted> : expenses.map(exp => (
        <Card key={exp.id}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Body style={styles.expAmount}>{formatCurrency(exp.amount)}</Body>
              <Muted>{exp.category} · {exp.expense_date.slice(0, 10)}</Muted>
              {exp.description ? <Muted>{exp.description}</Muted> : null}
            </View>
            <AppButton title="Delete" variant="secondary" onPress={() => deleteExpense(exp.id)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { fontWeight: '700', fontSize: 16, color: colors.primary },
  label: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600' },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { backgroundColor: colors.surfaceMuted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  catSelected: { backgroundColor: colors.primary },
  catText: { color: colors.ink, fontFamily, textTransform: 'capitalize' },
  catTextSelected: { color: colors.surface, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  expAmount: { fontWeight: '700', fontSize: 16 },
});
