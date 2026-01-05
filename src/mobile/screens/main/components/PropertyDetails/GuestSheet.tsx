import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheet, Input, Button } from '@/components';
import { Body, SmallText, Title } from '@/typography';
import { X, User, Clock } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Guest, SmartLock } from '@/types/Property';
import { CheckSquare, Square } from 'lucide-react-native';

interface GuestSheetProps {
    isVisible: boolean;
    onClose: () => void;
    onSave: (guestData: any) => Promise<void>;
    isLoading: boolean;
    initialGuest?: Guest | null;
    mode: 'add' | 'edit';
    smartLocks: SmartLock[];
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
    smartLocks,
    generatePin
}: GuestSheetProps) => {
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('avatar1');
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
    const [accessPin, setAccessPin] = useState('');
    const [selectedLockIds, setSelectedLockIds] = useState<string[]>([]);

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
                // Default to all locks if allowedLocks is undefined (legacy behavior compatibility) or use explicit list
                if (initialGuest.allowedLocks) {
                    setSelectedLockIds(initialGuest.allowedLocks);
                } else {
                    // For legacy guests without allowedLocks, we might want to default to nothing or everything.
                    // Request says "No shared, inferred, or inherited access".
                    // So we default to [], forcing the user to select.
                    setSelectedLockIds([]);
                }
            } else {
                setName('');
                setAvatar('avatar1');
                setStartTime(new Date());
                setEndTime(new Date(Date.now() + 2 * 60 * 60 * 1000));
                setAccessPin('');
                // Default new guests to have NO locks selected (Must be explicit)
                setSelectedLockIds([]);
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
        // Validate at least one lock is selected? Or allow guests with no locks?
        // "Lock selection is mandatory during guest creation or PIN generation."
        if (selectedLockIds.length === 0) {
            Alert.alert('Lock Selection Required', 'Please select at least one lock for this guest.');
            return;
        }

        // Validate Time Range
        if (startTime.getTime() >= endTime.getTime()) {
            Alert.alert('Invalid Schedule', 'End time must be after Start time');
            return;
        }

        const data: any = {
            name: name.trim(),
            avatar,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            allowedLocks: selectedLockIds,
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

                <View style={{ marginTop: 16 }}>
                    <Body weight="bold" style={{ marginBottom: 8 }}>Allowed Locks</Body>
                    <View style={{ gap: 8 }}>
                        {smartLocks.map(lock => {
                            const isSelected = selectedLockIds.includes(lock.device_id);
                            return (
                                <TouchableOpacity
                                    key={lock.device_id}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 12,
                                        backgroundColor: colors.slate50,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: isSelected ? colors.primary : colors.borderColor
                                    }}
                                    onPress={() => {
                                        if (isSelected) {
                                            setSelectedLockIds(prev => prev.filter(id => id !== lock.device_id));
                                        } else {
                                            setSelectedLockIds(prev => [...prev, lock.device_id]);
                                        }
                                    }}
                                >
                                    {isSelected ? (
                                        <CheckSquare size={20} color={colors.primary} />
                                    ) : (
                                        <Square size={20} color={colors.textSecondary} />
                                    )}
                                    <View style={{ marginLeft: 12 }}>
                                        <Body weight={isSelected ? "bold" : "regular"}>{lock.display_name}</Body>
                                        <SmallText variant="secondary" style={{ fontSize: 12 }}>{lock.manufacturer}</SmallText>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <SmallText variant="secondary" style={{ marginTop: 4 }}>Select at least one lock for this guest.</SmallText>
                </View>

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
                            <Clock size={16} color={colors.textSecondary} />
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
                            <Clock size={16} color={colors.textSecondary} />
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
        backgroundColor: colors.slate100,
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
        backgroundColor: colors.slate50,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderColor
    }
});
