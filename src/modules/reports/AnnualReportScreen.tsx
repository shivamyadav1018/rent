import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type MonthSummary = { month: number; collected: number; expected: number };

export function AnnualReportScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<MonthSummary[]>([]);

  useFocusEffect(useCallback(() => {
    paymentRepo.annualSummary(year).then(setData).catch(() => undefined);
  }, [year]));

  const totalExpected = data.reduce((s, d) => s + d.expected, 0);
  const totalCollected = data.reduce((s, d) => s + d.collected, 0);
  const maxBar = Math.max(...data.map(d => d.expected), 1);

  return (
    <Screen>
      <Title>Annual Report</Title>
      <View style={styles.yearRow}>
        <Pressable onPress={() => setYear(y => y - 1)} style={styles.yearBtn}><Body style={styles.yearBtnText}>‹</Body></Pressable>
        <Body style={styles.yearLabel}>{year}</Body>
        <Pressable onPress={() => setYear(y => Math.min(y + 1, currentYear))} style={styles.yearBtn}><Body style={styles.yearBtnText}>›</Body></Pressable>
      </View>
      <View style={styles.totalsRow}>
        <View style={styles.totalCard}><Muted>Expected</Muted><Body style={styles.totalValue}>{formatCurrency(totalExpected)}</Body></View>
        <View style={[styles.totalCard, styles.totalCardGreen]}><Muted>Collected</Muted><Body style={[styles.totalValue, styles.greenText]}>{formatCurrency(totalCollected)}</Body></View>
      </View>

      {/* Simple bar chart */}
      {data.length > 0 ? (
        <Card>
          <Body style={styles.chartTitle}>Monthly collection</Body>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {MONTH_NAMES.map((name, idx) => {
                const m = data.find(d => d.month === idx + 1);
                const col = m?.collected ?? 0;
                const exp = m?.expected ?? 0;
                const barH = exp > 0 ? Math.max(4, Math.round((col / maxBar) * 80)) : 4;
                const expH = Math.max(4, Math.round((exp / maxBar) * 80));
                return (
                  <View key={name} style={styles.barGroup}>
                    <View style={styles.barWrap}>
                      <View style={[styles.barExpected, { height: expH }]} />
                      <View style={[styles.barCollected, { height: barH }]} />
                    </View>
                    <Muted style={styles.barLabel}>{name}</Muted>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dotExpected]} /><Muted>Expected</Muted></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dotCollected]} /><Muted>Collected</Muted></View>
          </View>
        </Card>
      ) : null}

      {/* Month-by-month table */}
      <Card>
        <View style={styles.tableHeader}>
          <Body style={styles.col}>Month</Body>
          <Body style={styles.colRight}>Expected</Body>
          <Body style={styles.colRight}>Collected</Body>
          <Body style={styles.colRight}>Balance</Body>
        </View>
        {MONTH_NAMES.map((name, idx) => {
          const m = data.find(d => d.month === idx + 1);
          const exp = m?.expected ?? 0;
          const col = m?.collected ?? 0;
          const bal = exp - col;
          return (
            <View key={name} style={styles.tableRow}>
              <Muted style={styles.col}>{name}</Muted>
              <Muted style={styles.colRight}>{exp > 0 ? formatCurrency(exp) : '-'}</Muted>
              <Body style={[styles.colRight, col > 0 ? styles.greenText : {}]}>{col > 0 ? formatCurrency(col) : '-'}</Body>
              <Body style={[styles.colRight, bal > 0 ? styles.redText : {}]}>{exp > 0 ? formatCurrency(Math.max(bal, 0)) : '-'}</Body>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 4 },
  yearBtn: { padding: 8 },
  yearBtnText: { fontSize: 22, fontWeight: '700', color: colors.primary },
  yearLabel: { fontSize: 20, fontWeight: '700' },
  totalsRow: { flexDirection: 'row', gap: 12 },
  totalCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 14, gap: 4 },
  totalCardGreen: { backgroundColor: colors.primarySoft },
  totalValue: { fontSize: 18, fontWeight: '700' },
  greenText: { color: colors.primary },
  redText: { color: colors.danger },
  chartTitle: { fontWeight: '700', marginBottom: 12 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100, paddingBottom: 20 },
  barGroup: { alignItems: 'center', width: 28 },
  barWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barExpected: { width: 10, backgroundColor: colors.border, borderRadius: 3 },
  barCollected: { width: 10, backgroundColor: colors.primary, borderRadius: 3 },
  barLabel: { fontSize: 9, marginTop: 4 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  dotExpected: { backgroundColor: colors.border },
  dotCollected: { backgroundColor: colors.primary },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.border },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border },
  col: { flex: 1 },
  colRight: { flex: 1, textAlign: 'right' },
});
