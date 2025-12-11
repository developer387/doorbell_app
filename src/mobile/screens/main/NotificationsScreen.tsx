import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, Play, Circle } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Title, Body, MediumText, SmallText } from '@/typography';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';
import { FilterChips, type ChipItem } from '@/components';
import { useAuth } from '@/context/UserContext';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { GuestRequest } from '@/types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const RequestVideoPlayer = ({ videoUrl }: { videoUrl: string }) => {
    const player = useVideoPlayer(videoUrl, player => {
        player.loop = true;
        player.play();
    });

    return (
        <VideoView
            style={{ width: '100%', height: '100%' }}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
        />
    );
};

export const NotificationsScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const [activeChip, setActiveChip] = useState('requests');
    const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);

    const chips: ChipItem[] = [
        { label: 'Requests', value: 'requests', count: guestRequests.filter(r => r.status === 'pending').length },
        { label: 'System', value: 'system', count: 3 },
    ];

    useEffect(() => {
        if (!user) return;

        // Listen to guest requests for this user's properties
        const q = query(
            collection(db, 'guestRequests'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests: GuestRequest[] = [];
            snapshot.forEach((doc) => {
                requests.push({
                    id: doc.id,
                    ...doc.data(),
                } as GuestRequest);
            });

            // Sort by timestamp, newest first
            requests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setGuestRequests(requests);
        });

        return () => unsubscribe();
    }, [user]);

    const handleDecline = async (requestId: string) => {
        try {
            await updateDoc(doc(db, 'guestRequests', requestId), {
                status: 'declined',
            });
        } catch (error) {
            console.error('Error declining request:', error);
            Alert.alert('Error', 'Failed to decline request');
        }
    };



    const toggleVideo = (requestId: string) => {
        setPlayingVideo(playingVideo === requestId ? null : requestId);
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) + ' ' + date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const groupByMonth = (requests: GuestRequest[]) => {
        const groups: { [key: string]: GuestRequest[] } = {};
        requests.forEach(request => {
            const date = new Date(request.timestamp);
            const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) {
                groups[monthYear] = [];
            }
            groups[monthYear].push(request);
        });
        return groups;
    };

    const requestsByMonth = activeChip === 'requests' ? groupByMonth(guestRequests) : {};

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={colors.dark} />
                </TouchableOpacity>
                <Title>Notifications</Title>
            </View>

            <FilterChips
                items={chips}
                activeItem={activeChip}
                onItemPress={(item) => setActiveChip(item.value)}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {activeChip === 'requests' && (
                    <>
                        {Object.keys(requestsByMonth).length > 0 ? (
                            Object.entries(requestsByMonth).map(([monthYear, requests]) => (
                                <View key={monthYear}>
                                    <Body weight="bolder" style={styles.monthHeader}>{monthYear}</Body>
                                    {requests.map((request) => (
                                        <View key={request.id} style={styles.requestCard}>
                                            <View style={styles.requestHeader}>
                                                <View style={styles.guestInfo}>
                                                    <View style={styles.avatarPlaceholder}>
                                                        <Circle size={24} color={colors.primary} />
                                                    </View>
                                                    <View>
                                                        <Body weight="bolder">Guest</Body>
                                                        <SmallText variant="secondary">ID: {request.guestId}</SmallText>
                                                    </View>
                                                </View>
                                                <TouchableOpacity onPress={() => toggleVideo(request.id)}>
                                                    <Body variant="primary" style={styles.watchVideoButton}>
                                                        Watch Video
                                                        <Play size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                                                    </Body>
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.requestDetails}>
                                                <View style={styles.detailRow}>
                                                    <Body>Property name:</Body>
                                                    <Body variant="secondary">{request.propertyName}</Body>
                                                </View>
                                                <View style={styles.detailRow}>
                                                    <Body>Date & Time:</Body>
                                                    <Body variant="secondary">{formatDate(request.timestamp)}</Body>
                                                </View>
                                            </View>

                                            {/* Video Player - Conditionally Rendered */}
                                            {playingVideo === request.id && request.videoUrl && (
                                                <View style={styles.videoContainer}>
                                                    {Platform.OS === 'web' ? (
                                                        <video
                                                            controls
                                                            autoPlay
                                                            playsInline
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'contain',
                                                                backgroundColor: '#000',
                                                            }}
                                                            src={request.videoUrl}
                                                            onError={(e) => {
                                                                console.error('Video playback error:', e);
                                                            }}
                                                        >
                                                            Your browser does not support video playback.
                                                        </video>
                                                    ) : (
                                                        <RequestVideoPlayer videoUrl={request.videoUrl} />
                                                    )}
                                                </View>
                                            )}

                                            {request.status === 'pending' && (
                                                <View style={styles.actionButtons}>
                                                    <TouchableOpacity
                                                        style={styles.declineButton}
                                                        onPress={() => handleDecline(request.id)}
                                                    >
                                                        <MediumText variant="white" weight="bold">Decline</MediumText>
                                                    </TouchableOpacity>
                                                </View>
                                            )}

                                            {request.status !== 'pending' && (
                                                <View style={styles.statusBadge}>
                                                    <SmallText variant="secondary">
                                                        {request.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                                                    </SmallText>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Body variant="secondary">No guest requests yet</Body>
                            </View>
                        )}
                    </>
                )}

                {activeChip === 'system' && (
                    <View style={styles.emptyState}>
                        <Body variant="secondary">No system notifications</Body>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingTop: 50,
        paddingBottom: 16,
    },
    content: {
        flex: 1,
        marginTop: 16,
    },
    monthHeader: {
        marginVertical: 12,
    },
    requestCard: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    guestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.activeTagBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    watchVideoButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requestDetails: {
        gap: 8,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    videoContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    declineButton: {
        flex: 1,
        backgroundColor: colors.error,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    callButton: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusBadge: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
});
