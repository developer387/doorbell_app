import React, { useState } from 'react';
import { View, TextInput, type TextInputProps, type StyleProp, type ViewStyle, StyleSheet } from 'react-native';
import type { NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import { inputStyles } from '@/styles/inputStyles';
import { SmallText } from '@/typography';
import { colors } from '@/styles/colors';

interface InputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  isValid?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  rightIcon,
  error,
  isValid,
  style,
  label,
  onBlur,
  onFocus,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  let borderStyle = {};
  if (error) {
    borderStyle = inputStyles.inputError;
  } else if (isValid) {
    borderStyle = inputStyles.inputSuccess;
  } else if (isFocused) {
    borderStyle = inputStyles.inputFocus;
  }

  const showFloatingLabel = isFocused || value.length > 0;

  return (
    <View style={[inputStyles.container, style]}>
      <View style={[inputStyles.inputContainer, borderStyle]}>

        <View style={styles.flexCenter}>
          {showFloatingLabel && label && (
            <SmallText style={inputStyles.floatingLabel}>{label}</SmallText>
          )}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={!showFloatingLabel ? placeholder : ''}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={secureTextEntry}
            style={[
              inputStyles.input,
              showFloatingLabel && label ? inputStyles.inputWithFloatingLabel : {},
            ]}
            onFocus={handleFocus as unknown as TextInputProps['onFocus']}
            onBlur={handleBlur as unknown as TextInputProps['onBlur']}
            {...props}
          />
        </View>

        {rightIcon && <View style={inputStyles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <SmallText variant="error" style={inputStyles.errorText}>
          {error}
        </SmallText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flexCenter: {
    flex: 1,
    justifyContent: 'center',
  },
});
