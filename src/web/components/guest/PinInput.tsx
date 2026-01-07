import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';

interface PinInputProps {
    onSubmit: (pin: string) => void;
    onCancel: () => void;
    isLoading: boolean;
    errorMessage?: string;
    propertyName: string;
    propertyAddress: string;
}

export function PinInput({
    onSubmit,
    onCancel,
    isLoading,
    errorMessage,
    propertyName,
    propertyAddress,
}: PinInputProps) {
    const [pin1, setPin1] = useState('');
    const [pin2, setPin2] = useState('');
    const [pin3, setPin3] = useState('');
    const [pin4, setPin4] = useState('');

    const pin1Ref = useRef<TextInput>(null);
    const pin2Ref = useRef<TextInput>(null);
    const pin3Ref = useRef<TextInput>(null);
    const pin4Ref = useRef<TextInput>(null);

    const handlePinChange = (value: string, position: number) => {
        if (value.length > 1) return;
        if (value && !/^\d$/.test(value)) return;

        switch (position) {
            case 1:
                setPin1(value);
                if (value && pin2Ref.current) pin2Ref.current.focus();
                break;
            case 2:
                setPin2(value);
                if (value && pin3Ref.current) pin3Ref.current.focus();
                break;
            case 3:
                setPin3(value);
                if (value && pin4Ref.current) pin4Ref.current.focus();
                break;
            case 4:
                setPin4(value);
                break;
        }
    };

    const handleKeyPress = (e: { nativeEvent: { key: string } }, position: number) => {
        if (e.nativeEvent.key === 'Backspace') {
            switch (position) {
                case 2:
                    if (!pin2 && pin1Ref.current) pin1Ref.current.focus();
                    break;
                case 3:
                    if (!pin3 && pin2Ref.current) pin2Ref.current.focus();
                    break;
                case 4:
                    if (!pin4 && pin3Ref.current) pin3Ref.current.focus();
                    break;
            }
        }
    };

    const handleSubmit = () => {
        const fullPin = `${pin1}${pin2}${pin3}${pin4}`;
        if (fullPin.length === 4) {
            onSubmit(fullPin);
        }
    };

    const isComplete = pin1 && pin2 && pin3 && pin4;

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
                <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.propertyName}>{propertyName}</Text>
                    <Text style={styles.propertyAddress}>{propertyAddress}</Text>
                </View>
                <Text style={styles.propertyEmoji}>🏠</Text>
            </View>

            <Text style={styles.pinLabel}>Enter Access PIN</Text>

            <View style={styles.pinInputContainer}>
                <TextInput
                    ref={pin1Ref}
                    style={styles.pinBox}
                    value={pin1}
                    onChangeText={(val) => handlePinChange(val, 1)}
                    onKeyPress={(e) => handleKeyPress(e, 1)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                />
                <TextInput
                    ref={pin2Ref}
                    style={styles.pinBox}
                    value={pin2}
                    onChangeText={(val) => handlePinChange(val, 2)}
                    onKeyPress={(e) => handleKeyPress(e, 2)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                />
                <TextInput
                    ref={pin3Ref}
                    style={styles.pinBox}
                    value={pin3}
                    onChangeText={(val) => handlePinChange(val, 3)}
                    onKeyPress={(e) => handleKeyPress(e, 3)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                />
                <TextInput
                    ref={pin4Ref}
                    style={styles.pinBox}
                    value={pin4}
                    onChangeText={(val) => handlePinChange(val, 4)}
                    onKeyPress={(e) => handleKeyPress(e, 4)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                />
            </View>

            {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
                style={[
                    styles.confirmButton,
                    (!isComplete || isLoading) && styles.confirmButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isComplete || isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.confirmButtonText}>Confirm PIN</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#222',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        minHeight: 400,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        top: 20,
        zIndex: 1,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 20,
    },
    header: {
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 30,
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    propertyName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    propertyAddress: {
        color: '#aaa',
        fontSize: 12,
    },
    propertyEmoji: {
        fontSize: 24,
    },
    pinLabel: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    pinInputContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 30,
        width: '100%',
    },
    pinBox: {
        backgroundColor: 'transparent',
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        width: 65,
        height: 75,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    errorText: {
        color: '#ff4444',
        marginBottom: 10,
        fontSize: 14,
    },
    confirmButton: {
        backgroundColor: '#4ade80',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    confirmButtonDisabled: {
        opacity: 0.6,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
