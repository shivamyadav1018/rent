import type { Theme } from 'react-native-elements';

export const colors = {
  accent: '#4B61D1',
  background: '#FAF8FF',
  border: '#E9EDFF',
  danger: '#BA1A1A',
  dangerSoft: '#FFDAD6',
  ink: '#151B2A',
  muted: '#454653',
  primary: '#263BAA',
  primaryDark: '#001F94',
  primarySoft: '#F1F3FF',
  surface: '#FFFFFF',
  surfaceMuted: '#E9EDFF',
  success: '#00392B',
  successSoft: '#DDFBF1',
  mint: '#93F5D4',
  lavender: '#DEE0FF',
  warning: '#A15C00',
  warningSoft: '#FFF0D6',
};

export const authColors = {
  background: colors.surface,
  border: colors.border,
  ink: colors.ink,
  muted: colors.muted,
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primarySoft: colors.primarySoft,
};

export const fontFamily = 'Inter';

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 20,
};

export const shadow = {
  elevation: 1,
  shadowColor: '#1D2F91',
  shadowOffset: { height: 3, width: 0 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
};

export const authShadow = {
  elevation: 4,
  shadowColor: '#263BAA',
  shadowOffset: { height: 4, width: 0 },
  shadowOpacity: 0.10,
  shadowRadius: 16,
};

export const elementsTheme: Theme = {
  colors: {
    primary: colors.primary,
    secondary: colors.accent,
    grey0: colors.ink,
    grey1: colors.muted,
    grey5: colors.border,
    white: colors.surface,
    error: colors.danger,
    warning: colors.warning,
  },
  Text: {
    style: { color: colors.ink, fontFamily },
  },
  Button: {
    buttonStyle: { borderRadius: radius.md, minHeight: 50, paddingHorizontal: 18 },
    titleStyle: { fontFamily, fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  },
  Input: {
    inputStyle: { color: colors.ink, fontFamily, fontSize: 15 },
    labelStyle: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600' },
  },
};
