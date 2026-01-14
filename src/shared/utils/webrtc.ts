import {
    RTCPeerConnection as WebRTCPeerConnection,
    RTCIceCandidate as WebRTCIceCandidate,
    RTCSessionDescription as WebRTCSessionDescription,
    mediaDevices as WebMediaDevices,
    MediaStream as WebMediaStream,
} from './webrtc.web';

export const RTCPeerConnection = WebRTCPeerConnection;
export const RTCIceCandidate = WebRTCIceCandidate;
export const RTCSessionDescription = WebRTCSessionDescription;
export const mediaDevices = WebMediaDevices;
export const MediaStream = WebMediaStream;

export type MediaStreamType = InstanceType<typeof WebMediaStream>;
export type RTCPeerConnectionType = InstanceType<typeof WebRTCPeerConnection>;
