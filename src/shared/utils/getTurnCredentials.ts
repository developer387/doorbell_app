import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

interface IceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

interface TurnCredentialsResponse {
    iceServers: IceServer[];
    ttl: number;
}

// Cache for TURN credentials to avoid excessive API calls
let cachedCredentials: TurnCredentialsResponse | null = null;
let cacheExpiry: number = 0;

/**
 * Fetches TURN server credentials from Firebase Cloud Function
 * Credentials are cached and refreshed when they expire
 */
export async function getTurnCredentials(): Promise<IceServer[]> {
    const now = Date.now();

    // Return cached credentials if still valid (with 5 minute buffer)
    if (cachedCredentials && cacheExpiry > now + 5 * 60 * 1000) {
        console.log('[TURN] Using cached credentials');
        return cachedCredentials.iceServers;
    }

    try {
        console.log('[TURN] Fetching fresh credentials from Firebase');
        const getTurnCredentialsFn = httpsCallable<void, TurnCredentialsResponse>(
            functions,
            'getTurnCredentials'
        );

        const result = await getTurnCredentialsFn();
        const { iceServers, ttl } = result.data;

        // Cache the credentials
        cachedCredentials = result.data;
        cacheExpiry = now + ttl * 1000;

        console.log(`[TURN] Got ${iceServers.length} ICE servers, TTL: ${ttl}s`);
        return iceServers;
    } catch (error) {
        console.error('[TURN] Failed to fetch credentials:', error);

        // Return fallback public STUN servers if TURN fetch fails
        console.log('[TURN] Using fallback STUN servers only');
        return [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.relay.metered.ca:80' },
        ];
    }
}

/**
 * Clears the cached TURN credentials
 * Call this when you need to force a refresh
 */
export function clearTurnCredentialsCache(): void {
    cachedCredentials = null;
    cacheExpiry = 0;
}
