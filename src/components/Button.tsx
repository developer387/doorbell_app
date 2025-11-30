import React from 'react';
import { TouchableOpacity, ActivityIndicator, type StyleProp, type ViewStyle, View } from 'react-native';
import { buttonStyles } from '../styles/buttonStyles';
import { MediumText } from '../typography';
import { colors } from '../styles/colors';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  title: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  title,
  onPress,
  disabled,
  isLoading,
  leftIcon,
  style,
}) => {
  const variantStyle = buttonStyles[variant];
  const textStyle = variant === 'primary' ? buttonStyles.textPrimary : buttonStyles.textSecondary;

  return (
    <TouchableOpacity
      style={[buttonStyles.container, variantStyle, disabled && buttonStyles.disabled, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <>
          {leftIcon && <View style={buttonStyles.leftIconAbsolute}>{leftIcon}</View>}
          <MediumText style={[buttonStyles.text, textStyle]}>{title}</MediumText>
        </>
      )}
    </TouchableOpacity>
  );
};
