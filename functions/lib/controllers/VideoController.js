"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = exports.joinRoom = exports.createRoom = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const TwilioService_1 = require("../services/TwilioService");
// Helper to instantiate service
const getService = () => new TwilioService_1.TwilioService();
// Using 'any' for req/res to avoid type conflicts between firebase-functions and @types/express
// The logic assumes they are Express-compatible Request/Response objects.
const createRoom = async (req, res) => {
    try {
        const { roomName } = req.body;
        const service = getService();
        // roomName is optional; if provided, it creates/fetches that specific room.
        const room = await service.createRoom(roomName);
        logger.info(`Room created/fetched: ${room.uniqueName}`, { sid: room.sid });
        res.status(200).json({
            sid: room.sid,
            uniqueName: room.uniqueName,
            status: room.status,
            url: room.url
        });
    }
    catch (error) {
        logger.error("Error creating room", error);
        res.status(500).json({ error: error.message });
    }
};
exports.createRoom = createRoom;
const joinRoom = async (req, res) => {
    try {
        const { roomName, identity } = req.body;
        if (!roomName || !identity) {
            res.status(400).json({ error: "Missing roomName or identity" });
            return;
        }
        const service = getService();
        // Ensure room exists and is active before allowing join
        // This prevents users from joining closed rooms with a valid token
        await service.activeRoom(roomName);
        // Generate token
        const token = service.generateToken(roomName, identity);
        logger.info(`User ${identity} joined room ${roomName}`);
        res.status(200).json({
            token,
            identity,
            roomName
        });
    }
    catch (error) {
        logger.error("Error joining room", error);
        if (error.message && (error.message.includes("not found") || error.message.includes("closed"))) {
            res.status(404).json({ error: "Room not found or inactive" });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
};
exports.joinRoom = joinRoom;
const getToken = async (req, res) => {
    try {
        const { roomName, identity } = req.body;
        if (!roomName || !identity) {
            res.status(400).json({ error: "Missing roomName or identity" });
            return;
        }
        const service = getService();
        const token = service.generateToken(roomName, identity);
        logger.info(`Token generated for ${identity} in ${roomName}`);
        res.status(200).json({
            token,
            identity,
            roomName
        });
    }
    catch (error) {
        logger.error("Error generating token", error);
        res.status(500).json({ error: error.message });
    }
};
exports.getToken = getToken;
//# sourceMappingURL=VideoController.js.map