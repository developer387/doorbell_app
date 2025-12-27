import React, { useEffect, useRef } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    PanResponder,
} from 'react-native';
import { colors } from '../styles/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT - 30;
const MIN_BOTTOM_SHEET_HEIGHT = 200;

interface BottomSheetProps {
    isVisible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    snapPoints?: number[]; // Optional custom snap points as percentages of screen height
    enablePanGesture?: boolean; // Enable swipe down to close
    closeOnBackdropPress?: boolean; // Close when backdrop is pressed
    minHeight?: number; // Minimum height when content is small
    maxHeight?: number; // Maximum height (default: screen height - 30)
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    isVisible,
    onClose,
    children,
    snapPoints,
    enablePanGesture = true,
    closeOnBackdropPress = true,
    minHeight = MIN_BOTTOM_SHEET_HEIGHT,
    maxHeight = MAX_BOTTOM_SHEET_HEIGHT,
}) => {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const contentHeight = useRef(0);

    // Pan responder for swipe down to close
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => enablePanGesture,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return enablePanGesture && Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    closeSheet();
                } else {
                    openSheet();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (isVisible) {
            openSheet();
        } else {
            closeSheet();
        }
    }, [isVisible]);

    const openSheet = () => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleBackdropPress = () => {
        if (closeOnBackdropPress) {
            closeSheet();
        }
    };

    const handleContentLayout = (event: any) => {
        const { height } = event.nativeEvent.layout;
        contentHeight.current = Math.min(Math.max(height, minHeight), maxHeight);
    };

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={closeSheet}
        >
            <View style={styles.modalContainer}>
                {/* Backdrop */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={handleBackdropPress}
                >
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFillObject,
                            styles.backdrop,
                            {
                                opacity: backdropOpacity,
                            },
                        ]}
                    />
                </TouchableOpacity>

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            transform: [{ translateY }],
                            maxHeight,
                        },
                    ]}
                >
                    {/* Handle */}
                    <View style={styles.handleContainer} {...panResponder.panHandlers}>
                        <View style={styles.handle} />
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={true}
                        bounces={false}
                        onLayout={handleContentLayout}
                    >
                        {children}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheetContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
    },
    scrollView: {
        maxHeight: MAX_BOTTOM_SHEET_HEIGHT - 50, // Account for handle
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
});
