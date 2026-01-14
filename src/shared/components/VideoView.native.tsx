import React from 'react';
import { RTCView } from 'react-native-webrtc';

interface VideoViewProps {
    streamURL: any; // React Native WebRTC expects the stream object or URL depending on version, but typically the stream object's toURL() if older, or object if newer.
    // v111+ supports passing MediaStream directly to streamURL prop of RTCView? 
    // Actually RTCView prop is 'streamURL' taking a string. 
    // But modern react-native-webrtc often just takes the stream object in a custom prop or via toURL().
    // user's package.json says "^124.0.0". 
    // In strict typing, we might needed toURL().
    style?: any;
    objectFit?: 'cover' | 'contain';
    mirror?: boolean;
}

export const VideoView = ({ streamURL, style, objectFit = 'contain', mirror = false }: VideoViewProps) => {
    // If streamURL is an object (MediaStream), convert to URL if methods exist, otherwise pass as is.
    const url = streamURL && typeof streamURL.toURL === 'function' ? streamURL.toURL() : streamURL;

    return (
        <RTCView
            streamURL={url}
            style={style}
            objectFit={objectFit}
            mirror={mirror}
        />
    );
};
