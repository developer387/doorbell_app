import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BottomSheet, Input, Button } from '@/components';
import { Body, SmallText, Title } from '@/typography';
import { X, User, Clock } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Guest } from '@/types/Property';

interface GuestSheetProps {
    isVisible: boolean;
    onClose: () => void;
    onSave: (guestData: any) => Promise<void>;
    isLoading: boolean;
    initialGuest?: Guest | null;
    mode: 'add' | 'edit';
    generatePin?: () => string;
}

interface DateState {
    showStart: boolean;
    showEnd: boolean;
    mode: 'date' | 'time';
}

export const GuestSheet = ({
    isVisible,
    onClose,
    onSave,
    isLoading,
    initialGuest,
    mode,
    generatePin
}: GuestSheetProps) => {
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('avatar1');
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
    const [accessPin, setAccessPin] = useState('');

    const [dateState, setDateState] = useState<DateState>({
        showStart: false,
        showEnd: false,
        mode: 'date'
    });

    useEffect(() => {
        if (isVisible) {
            if (mode === 'edit' && initialGuest) {
                setName(initialGuest.name);
                setAvatar(initialGuest.avatar);
                setStartTime(new Date(initialGuest.startTime));
                setEndTime(new Date(initialGuest.endTime));
                setAccessPin(initialGuest.accessPin);
            } else {
                setName('');
                setAvatar('avatar1');
                setStartTime(new Date());
                setEndTime(new Date(Date.now() + 2 * 60 * 60 * 1000));
                setAccessPin('');
            }
        }
    }, [isVisible, initialGuest, mode]);

    const handleDateChange = (
        event: any,
        date: Date | undefined,
        type: 'start' | 'end'
    ) => {
        const currentShowKey = type === 'start' ? 'showStart' : 'showEnd';

        if (event.type === 'dismissed') {
            setDateState(prev => ({ ...prev, [currentShowKey]: false }));
            return;
        }

        if (date) {
            const targetSetter = type === 'start' ? setStartTime : setEndTime;
            const currentValue = type === 'start' ? startTime : endTime;

            if (dateState.mode === 'date') {
                const newDate = new Date(currentValue);
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                targetSetter(newDate);

                if (Platform.OS === 'android') {
                    setDateState(prev => ({ ...prev, [currentShowKey]: false, mode: 'time' }));
                    setTimeout(() => setDateState(prev => ({ ...prev, [currentShowKey]: true })), 100);
                } else {
                    setDateState(prev => ({ ...prev, mode: 'time' }));
                }
            } else {
                const newDate = new Date(currentValue);
                newDate.setHours(date.getHours(), date.getMinutes());
                targetSetter(newDate);
                setDateState(prev => ({ ...prev, [currentShowKey]: false }));
            }
        } else {
            setDateState(prev => ({ ...prev, [currentShowKey]: false }));
        }
    };

    const handleSave = async () => {
        const data: any = {
            name: name.trim(),
            avatar,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
        };

        // Only include pin if editing/specified
        if (mode === 'edit') {
            data.accessPin = accessPin;
        }

        await onSave(data);
    };

    const handleRegeneratePin = () => {
        if (generatePin) {
            setAccessPin(generatePin());
        }
    };

    return (
        <BottomSheet
            isVisible={isVisible}
            onClose={onClose}
            minHeight={600}
        >
            <ScrollView>
                <View style={styles.sheetHeader}>
                    <Body weight="bolder">{mode === 'edit' ? 'Edit Guest' : 'Add guest'}</Body>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color={colors.dark} />
                    </TouchableOpacity>
                </View>

                <SmallText variant="secondary" style={{ marginBottom: 10 }}>Pick an Avatar for your guest</SmallText>
                <View style={styles.avatarSelectionCmd}>
                    {['avatar1', 'avatar2', 'avatar3', 'avatar4'].map((av) => (
                        <TouchableOpacity
                            key={av}
                            style={[
                                styles.avatarOption,
                                avatar === av && styles.selectedAvatar
                            ]}
                            onPress={() => setAvatar(av)}
                        >
                            <View style={[styles.avatarCircleLarge, { backgroundColor: av === 'avatar1' ? '#4CAF50' : av === 'avatar2' ? '#FFC107' : av === 'avatar3' ? '#2196F3' : '#E91E63' }]}>
                                <User size={30} color="white" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <Input
                    label="Guest name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Guest name (e.g Cleaner)"
                    maxLength={20}
                />

                <View style={styles.timePickerContainer}>
                    <View style={{ flex: 1 }}>
                        <Body weight="bold" style={{ marginBottom: 8 }}>Start time</Body>
                        <TouchableOpacity
                            style={styles.timeInput}
                            onPress={() => setDateState({ showStart: true, showEnd: false, mode: 'date' })}
                        >
                            <View>
                                <Body>{startTime.toLocaleDateString()}</Body>
                                <SmallText variant="secondary">{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</SmallText>
                            </View>
                            <Clock size={16} color="#888888" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Body weight="bold" style={{ marginBottom: 8 }}>End time</Body>
                        <TouchableOpacity
                            style={styles.timeInput}
                            onPress={() => setDateState({ showStart: false, showEnd: true, mode: 'date' })}
                        >
                            <View>
                                <Body>{endTime.toLocaleDateString()}</Body>
                                <SmallText variant="secondary">{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</SmallText>
                            </View>
                            <Clock size={16} color="#888888" />
                        </TouchableOpacity>
                    </View>
                </View>

                {dateState.showStart && (
                    <DateTimePicker
                        value={startTime}
                        mode={dateState.mode}
                        onChange={(e, d) => handleDateChange(e, d, 'start')}
                    />
                )}
                {dateState.showEnd && (
                    <DateTimePicker
                        value={endTime}
                        mode={dateState.mode}
                        onChange={(e, d) => handleDateChange(e, d, 'end')}
                    />
                )}

                {mode === 'edit' && (
                    <View style={{ marginBottom: 24 }}>
                        <Body weight="bold" style={{ marginBottom: 8 }}>Access PIN</Body>
                        <View style={styles.pinContainer}>
                            <Title>{accessPin}</Title>
                            <TouchableOpacity onPress={handleRegeneratePin} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Body variant="primary">Regenerate</Body>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <Button
                    title={mode === 'edit' ? "Save Changes" : "Save & Generate Access PIN"}
                    onPress={handleSave}
                    isLoading={isLoading}
                    style={styles.saveButton}
                />
            </ScrollView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarSelectionCmd: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20
    },
    avatarOption: {
        padding: 2,
        borderRadius: 35
    },
    selectedAvatar: {
        borderWidth: 2,
        borderColor: colors.primary
    },
    avatarCircleLarge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    timePickerContainer: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 15,
        marginBottom: 20
    },
    timeInput: {
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    saveButton: {
        marginTop: 16,
    },
    pinContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    }
});
