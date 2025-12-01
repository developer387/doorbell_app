import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { textStyles } from '@/styles/textStyles';

export interface BaseTextProps extends TextProps {
  variant?: 'primary' | 'black' | 'success' | 'error' | 'default' | 'white';
  size?: 'title' | 'heading' | 'body' | 'medium' | 'small' | 'extraSmall';
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export const BaseText: React.FC<BaseTextProps> = ({
  variant = 'default',
  size = 'body',
  align,
  style,
  children,
  ...props
}) => {
  const variantStyle = variant !== 'default' ? textStyles[variant as keyof typeof textStyles] : {};
  const sizeStyle = textStyles[size as keyof typeof textStyles];
  const alignStyle = align ? { textAlign: align } : {};

  return (
    <Text style={[textStyles.base, sizeStyle, variantStyle, alignStyle, style]} {...props}>
      {children}
    </Text>
  );
};
