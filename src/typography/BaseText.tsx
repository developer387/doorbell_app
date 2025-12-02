import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { textStyles } from '@/styles/textStyles';

export interface BaseTextProps extends TextProps {
  variant?: 'primary' | 'black' | 'success' | 'error' | 'default' | 'white';
  size?: 'title' | 'heading' | 'body' | 'medium' | 'small' | 'extraSmall';
  align?: 'left' | 'center' | 'right';
  weight?: 'light' | 'normal' | 'bold' | 'bolder';
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export const BaseText: React.FC<BaseTextProps> = ({
  variant = 'default',
  size = 'body',
  align,
  weight = 'normal',
  style,
  children,
  ...props
}) => {
  const sizeStyle = textStyles[size as keyof typeof textStyles];

  // explicit mapping for weights is safer than indexing the stylesheet
  const weightMap: Record<NonNullable<BaseTextProps['weight']>, any> = {
    light: textStyles.light,
    normal: textStyles.normal,
    bold: textStyles.bold,
    bolder: textStyles.bolder,
  };
  const weightStyle = weightMap[weight];

  // variant style only applied when not default
  const variantStyle =
    variant !== 'default' ? textStyles[variant as keyof typeof textStyles] : undefined;

  const alignStyle = align ? ({ textAlign: align } as TextStyle) : undefined;

  return (
    <Text
      style={[textStyles.base, sizeStyle, variantStyle, weightStyle, alignStyle, style]}
      {...props}
    >
      {children}
    </Text>
  );
};
