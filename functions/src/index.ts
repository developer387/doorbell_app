import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const expo = new Expo();

interface GuestRequest {
    propertyId: string;
    status: string;
    createdAt: admin.firestore.Timestamp;
}

interface Property {
    ownerId: string;
    propertyName?: string;
    address?: string;
}

interface UserDeviceToken {
    token: string;
    platform: string;
    updatedAt: string;
}

/**
 * Triggered when a new guestRequest is created with status 'calling'
 * Sends a push notification to the property owner
 */
export const onGuestRequestCreated = functions.firestore
    .document('guestRequests/{requestId}')
    .onCreate(async (snapshot, context) => {
        const requestId = context.params.requestId;
        const request = snapshot.data() as GuestRequest;

        // Only process 'calling' status requests
        if (request.status !== 'calling') {
            console.log(`Request ${requestId} status is ${request.status}, skipping notification`);
            return null;
        }

        const propertyId = request.propertyId;
        if (!propertyId) {
            console.error(`Request ${requestId} has no propertyId`);
            return null;
        }

        try {
            // Get the property to find the owner
            const propertyDoc = await db.collection('properties').doc(propertyId).get();
            if (!propertyDoc.exists) {
                console.error(`Property ${propertyId} not found`);
                return null;
            }

            const property = propertyDoc.data() as Property;
            const ownerId = property.ownerId;
            if (!ownerId) {
                console.error(`Property ${propertyId} has no ownerId`);
                return null;
            }

            // Get the owner's device token
            const tokenDoc = await db.collection('userDeviceTokens').doc(ownerId).get();
            if (!tokenDoc.exists) {
                console.log(`No device token found for owner ${ownerId}`);
                return null;
            }

            const tokenData = tokenDoc.data() as UserDeviceToken;
            const pushToken = tokenData.token;

            // Validate Expo push token
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Invalid Expo push token: ${pushToken}`);
                return null;
            }

            // Build the notification message
            const propertyName = property.propertyName || 'Your Property';
            const message: ExpoPushMessage = {
                to: pushToken,
                sound: 'default',
                title: 'Incoming Doorbell Call',
                body: `Someone is at ${propertyName}`,
                data: {
                    type: 'incoming_call',
                    propertyId: propertyId,
                    propertyName: propertyName,
                    requestId: requestId,
                },
                priority: 'high',
                channelId: 'doorbell-calls',
            };

            // Send the notification
            const chunks = expo.chunkPushNotifications([message]);
            const tickets = [];

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                    console.log(`Push notification sent to ${ownerId}:`, ticketChunk);
                } catch (error) {
                    console.error('Error sending push notification chunk:', error);
                }
            }

            // Log results
            for (const ticket of tickets) {
                if (ticket.status === 'error') {
                    console.error(`Push notification error: ${ticket.message}`);
                    if (ticket.details?.error === 'DeviceNotRegistered') {
                        // Remove invalid token
                        await db.collection('userDeviceTokens').doc(ownerId).delete();
                        console.log(`Removed invalid token for user ${ownerId}`);
                    }
                }
            }

            return { success: true, tickets };
        } catch (error) {
            console.error('Error in onGuestRequestCreated:', error);
            return null;
        }
    });

/**
 * Scheduled function to clean up unanswered calls
 * Runs every minute and marks stale 'calling' requests as 'missed'
 */
export const cleanupUnansweredCalls = functions.pubsub
    .schedule('every 1 minutes')
    .onRun(async () => {
        const now = admin.firestore.Timestamp.now();
        // Consider calls older than 60 seconds as missed
        const cutoffTime = new admin.firestore.Timestamp(
            now.seconds - 60,
            now.nanoseconds
        );

        try {
            // Find all 'calling' requests older than cutoff
            const snapshot = await db
                .collection('guestRequests')
                .where('status', '==', 'calling')
                .where('createdAt', '<', cutoffTime)
                .get();

            if (snapshot.empty) {
                console.log('No stale calls to clean up');
                return null;
            }

            // Batch update all stale requests
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, { status: 'missed' });
                console.log(`Marking request ${doc.id} as missed`);
            });

            await batch.commit();
            console.log(`Cleaned up ${snapshot.docs.length} stale calls`);

            // Optionally send missed call notifications
            for (const doc of snapshot.docs) {
                const request = doc.data() as GuestRequest;
                await sendMissedCallNotification(request.propertyId, doc.id);
            }

            return { cleanedUp: snapshot.docs.length };
        } catch (error) {
            console.error('Error in cleanupUnansweredCalls:', error);
            return null;
        }
    });

/**
 * Helper function to send missed call notification
 */
async function sendMissedCallNotification(propertyId: string, requestId: string): Promise<void> {
    try {
        const propertyDoc = await db.collection('properties').doc(propertyId).get();
        if (!propertyDoc.exists) return;

        const property = propertyDoc.data() as Property;
        const ownerId = property.ownerId;
        if (!ownerId) return;

        const tokenDoc = await db.collection('userDeviceTokens').doc(ownerId).get();
        if (!tokenDoc.exists) return;

        const tokenData = tokenDoc.data() as UserDeviceToken;
        const pushToken = tokenData.token;

        if (!Expo.isExpoPushToken(pushToken)) return;

        const propertyName = property.propertyName || 'Your Property';
        const message: ExpoPushMessage = {
            to: pushToken,
            sound: 'default',
            title: 'Missed Doorbell Call',
            body: `You missed a call at ${propertyName}`,
            data: {
                type: 'missed_call',
                propertyId: propertyId,
                propertyName: propertyName,
                requestId: requestId,
            },
            priority: 'default',
            channelId: 'doorbell-calls',
        };

        await expo.sendPushNotificationsAsync([message]);
        console.log(`Sent missed call notification for request ${requestId}`);
    } catch (error) {
        console.error('Error sending missed call notification:', error);
    }
}

/**
 * Twilio ICE server credentials response type
 */
interface TwilioIceServer {
    url?: string;
    urls?: string;
    username?: string;
    credential?: string;
}

interface TwilioTokenResponse {
    username: string;
    ice_servers: TwilioIceServer[];
    ttl: string;
    date_created: string;
    date_updated: string;
    account_sid: string;
    password: string;
}

/**
 * Callable function to get Twilio TURN credentials
 * Returns ICE servers with temporary credentials for WebRTC connections
 *
 * Configure secrets with:
 *   firebase functions:secrets:set TWILIO_ACCOUNT_SID
 *   firebase functions:secrets:set TWILIO_API_KEY_SID
 *   firebase functions:secrets:set TWILIO_API_KEY_SECRET
 */
export const getTurnCredentials = functions
    .runWith({
        secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET'],
    })
    .https.onCall(async () => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKeySid = process.env.TWILIO_API_KEY_SID;
        const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

        // Validate Twilio configuration
        if (!accountSid || !apiKeySid || !apiKeySecret) {
            console.error('Twilio secrets missing. Set with: firebase functions:secrets:set TWILIO_ACCOUNT_SID, etc.');
            throw new functions.https.HttpsError(
                'failed-precondition',
                'TURN server configuration is incomplete'
            );
        }

        try {
            // Request temporary TURN credentials from Twilio
            const authHeader = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64');
            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    // Request 1-hour TTL (default is 24 hours)
                    body: 'Ttl=3600',
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Twilio API error:', response.status, errorText);
                throw new functions.https.HttpsError(
                    'internal',
                    'Failed to fetch TURN credentials from Twilio'
                );
            }

            const data = await response.json() as TwilioTokenResponse;

            // Transform Twilio response to standard ICE server format
            const iceServers = data.ice_servers.map((server: TwilioIceServer) => ({
                urls: server.urls || server.url,
                username: server.username,
                credential: server.credential,
            }));

            console.log(`Generated TURN credentials, TTL: ${data.ttl}s, servers: ${iceServers.length}`);

            return {
                iceServers,
                ttl: parseInt(data.ttl, 10),
            };
        } catch (error) {
            console.error('Error fetching Twilio TURN credentials:', error);
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            throw new functions.https.HttpsError(
                'internal',
                'Failed to generate TURN credentials'
            );
        }
    });
