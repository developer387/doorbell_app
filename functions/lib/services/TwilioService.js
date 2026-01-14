"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioService = void 0;
const twilio_1 = __importDefault(require("twilio"));
class TwilioService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
        this.apiKeySid = process.env.TWILIO_API_KEY_SID || "";
        this.apiKeySecret = process.env.TWILIO_API_KEY_SECRET || "";
        if (!this.accountSid || !this.apiKeySid || !this.apiKeySecret) {
            throw new Error("Missing Twilio credentials. Ensure secrets are configured.");
        }
        // Initialize Twilio client
        this.client = (0, twilio_1.default)(this.apiKeySid, this.apiKeySecret, {
            accountSid: this.accountSid,
        });
    }
    /**
     * Creates a video room. Idempotent: if room exists and is in-progress, returns it.
     * @param roomName Optional unique name for the room
     */
    async createRoom(roomName) {
        try {
            const room = await this.client.video.v1.rooms.create({
                uniqueName: roomName,
                type: 'group', // Support multi-participant and 1:1
            });
            return room;
        }
        catch (error) {
            // If the room already exists (code 53113), fetch it to return consistent response
            if (error.code === 53113) {
                if (roomName) {
                    return await this.activeRoom(roomName);
                }
            }
            throw error;
        }
    }
    /**
     * Checks if a room exists and is in-progress.
     */
    async activeRoom(roomName) {
        try {
            const room = await this.client.video.v1.rooms(roomName).fetch();
            if (room.status === 'completed') {
                throw new Error("Room is closed");
            }
            return room;
        }
        catch (error) {
            throw new Error(`Room not found or invalid: ${roomName}`);
        }
    }
    /**
     * Generates a short-lived Access Token for the participant.
     */
    generateToken(roomName, identity) {
        const AccessToken = twilio_1.default.jwt.AccessToken;
        const VideoGrant = AccessToken.VideoGrant;
        // Create an Access Token
        const token = new AccessToken(this.accountSid, this.apiKeySid, this.apiKeySecret, { identity: identity, ttl: 3600 } // 1 hour
        );
        // Grant access to Video
        const grant = new VideoGrant({
            room: roomName,
        });
        token.addGrant(grant);
        // Serialize the token to a JWT string
        return token.toJwt();
    }
}
exports.TwilioService = TwilioService;
//# sourceMappingURL=TwilioService.js.map