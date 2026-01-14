import {
    RTCPeerConnection as RNRTCPeerConnection,
    RTCIceCandidate as RNRTCIceCandidate,
    RTCSessionDescription as RNRTCSessionDescription,
    mediaDevices as RNmediaDevices,
    MediaStream as RNMediaStream,
} from 'react-native-webrtc';

export const RTCPeerConnection = RNRTCPeerConnection;
export const RTCIceCandidate = RNRTCIceCandidate;
export const RTCSessionDescription = RNRTCSessionDescription;
export const mediaDevices = RNmediaDevices;
export const MediaStream = RNMediaStream;

export type MediaStreamType = RNMediaStream;
export type RTCPeerConnectionType = RNRTCPeerConnection;
