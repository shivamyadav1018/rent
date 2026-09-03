import React from 'react';
import { ViewStyle } from 'react-native';
import { Chip } from 'react-native-elements';

import { colors, fontFamily, radius } from '../theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function AppChip({ label, onPress, selected = false, style }: Props) {
  return (
    <Chip
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      buttonStyle={[styles.button, selected ? styles.selected : styles.unselected]}
      containerStyle={style}
      onPress={onPress}
      title={label}
      titleStyle={[styles.title, selected ? styles.selectedTitle : styles.unselectedTitle]}
      type={selected ? 'solid' : 'outline'}
    />
  );
}

const styles = {
  button: { borderRadius: radius.pill, minHeight: 38, paddingHorizontal: 14 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedTitle: { color: colors.surface, fontWeight: '700' as const },
  title: { fontFamily, fontSize: 14, textTransform: 'capitalize' as const },
  unselected: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  unselectedTitle: { color: colors.ink },
};
