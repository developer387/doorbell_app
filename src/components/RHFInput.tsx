import React, { useEffect } from 'react';
import { type UseFormRegister, type UseFormSetValue, type UseFormWatch, type FieldValues, type Path, type RegisterOptions } from 'react-hook-form';
import { Input } from './Input';
import { type TextInputProps } from 'react-native';

interface RHFInputProps<TFieldValues extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
    name: Path<TFieldValues>;
    register: UseFormRegister<TFieldValues>;
    setValue: UseFormSetValue<TFieldValues>;
    watch: UseFormWatch<TFieldValues>;
    rules?: RegisterOptions<TFieldValues>;
    error?: string;
    label?: string;
    placeholder?: string;
    secureTextEntry?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function RHFInput<TFieldValues extends FieldValues>({
    name,
    register,
    setValue,
    watch,
    rules,
    error,
    label,
    placeholder,
    secureTextEntry,
    leftIcon,
    rightIcon,
    ...props
}: RHFInputProps<TFieldValues>) {
    // Register the field with validation rules
    useEffect(() => {
        register(name, rules);
    }, [name, register, rules]);

    // Watch the current value
    const value = watch(name) || '';

    // Handle text change
    const handleChangeText = (text: string) => {
        setValue(name, text as any, { shouldValidate: true, shouldDirty: true });
    };

    return (
        <Input
            value={String(value)}
            onChangeText={handleChangeText}
            label={label}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            error={error}
            {...props}
        />
    );
}
