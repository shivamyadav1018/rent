import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { Body, Muted } from './Typography';
import { colors, fontFamily, radius } from '../theme';
import { displayDate } from '../utils/dates';

type Props = {
  error?: string;
  label: string;
  maximumDate?: Date;
  onChange: (value: string) => void;
  value: string;
};

const toLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
  );
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

export function AppDatePicker({
  error,
  label,
  maximumDate,
  onChange,
  value,
}: Props) {
  const selectedDate = useMemo(() => toLocalDate(value), [value]);
  const [showIOSCalendar, setShowIOSCalendar] = useState(false);

  const handleChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (event.type === 'set' && nextDate) onChange(toDateString(nextDate));
  };

  const openCalendar = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        display: 'calendar',
        maximumDate,
        mode: 'date',
        onChange: handleChange,
        value: selectedDate,
      });
      return;
    }
    setShowIOSCalendar(true);
  };

  return (
    <View style={styles.container}>
      <Body style={styles.label}>{label}</Body>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${displayDate(value)}. Open calendar`}
        onPress={openCalendar}
        style={({ pressed }) => [
          styles.field,
          error ? styles.errorField : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <AppIcon
          color={colors.primary}
          name="calendar-month-outline"
          size={21}
        />
        <Body style={styles.value}>{displayDate(value)}</Body>
        <AppIcon color={colors.muted} name="chevron-down" size={20} />
      </Pressable>
      {error ? <Muted style={styles.error}>{error}</Muted> : null}
      {Platform.OS === 'ios' && showIOSCalendar ? (
        <View style={styles.iosCalendar}>
          <DateTimePicker
            display="inline"
            maximumDate={maximumDate}
            mode="date"
            onChange={handleChange}
            value={selectedDate}
          />
          <AppButton
            size="compact"
            title="Done"
            onPress={() => setShowIOSCalendar(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  error: { color: colors.danger, fontSize: 12 },
  errorField: { borderColor: colors.danger },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  iosCalendar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
  },
  label: { fontFamily, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  value: { flex: 1 },
});
