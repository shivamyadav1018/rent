import React from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import { Button } from 'react-native-elements';

import { colors, radius } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  icon?: React.ReactNode;
  disabled?: boolean;
  textStyle?: TextStyle;
};

export function AppButton({ disabled, icon, title, onPress, style, textStyle, variant = 'primary' }: Props) {
  const secondary = variant === 'secondary';
  const danger = variant === 'danger';

  return (
    <Button
      buttonStyle={[
        styles.base,
        secondary ? styles.secondary : danger ? styles.danger : styles.primary,
      ]}
      containerStyle={style}
      disabled={disabled}
      disabledStyle={styles.disabled}
      icon={icon as React.ReactElement<object>}
      iconContainerStyle={styles.icon}
      onPress={onPress}
      title={title}
      titleStyle={[
        secondary ? styles.secondaryText : danger ? styles.dangerText : styles.primaryText,
        textStyle,
      ]}
      type={secondary || danger ? 'outline' : 'solid'}
    />
  );
}

const styles = {
  base: { borderRadius: radius.md, minHeight: 50, paddingHorizontal: 18 },
  danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  dangerText: { color: colors.danger },
  disabled: { opacity: 0.5 },
  icon: { marginRight: 8 },
  primary: { backgroundColor: colors.primary },
  primaryText: { color: colors.surface },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  secondaryText: { color: colors.primaryDark },
} satisfies Record<string, ViewStyle | TextStyle>;
