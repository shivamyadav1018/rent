import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Icon } from 'react-native-elements';

type Props = {
  name: string;
  color: string;
  size?: number;
  style?: StyleProp<TextStyle>;
};

export function AppIcon({ color, name, size = 20, style }: Props) {
  return <Icon color={color} iconStyle={style as TextStyle} name={name} size={size} type="material-community" />;
}
