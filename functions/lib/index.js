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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.token = exports.joinRoom = exports.createRoom = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors_1 = __importDefault(require("cors"));
const VideoController = __importStar(require("./controllers/VideoController"));
// Initialize CORS middleware to allow requests from any origin
const corsHandler = (0, cors_1.default)({ origin: true });
// Define the configuration options, including the secrets required
// These secrets correspond to the ones set via `firebase functions:secrets:set`
const functionOpts = {
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET"],
    maxInstances: 10,
    region: "us-central1", // The default region can be changed if needed
};
// --- Exported Functions ---
// Endpoint: /createRoom
exports.createRoom = (0, https_1.onRequest)(functionOpts, (req, res) => {
    corsHandler(req, res, () => {
        VideoController.createRoom(req, res);
    });
});
// Endpoint: /joinRoom
exports.joinRoom = (0, https_1.onRequest)(functionOpts, (req, res) => {
    corsHandler(req, res, () => {
        VideoController.joinRoom(req, res);
    });
});
// Endpoint: /token
exports.token = (0, https_1.onRequest)(functionOpts, (req, res) => {
    corsHandler(req, res, () => {
        VideoController.getToken(req, res);
    });
});
//# sourceMappingURL=index.js.map