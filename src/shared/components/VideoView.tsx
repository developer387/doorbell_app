import React, { useRef, useEffect } from 'react';

interface VideoViewProps {
    streamURL: MediaStream | null; // On web we pass the object directly
    style?: any;
    objectFit?: 'cover' | 'contain';
    mirror?: boolean;
}

export const VideoView = ({ streamURL, style, objectFit = 'contain', mirror = false }: VideoViewProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && streamURL) {
            videoRef.current.srcObject = streamURL;
        } else if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [streamURL]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={mirror}
            style={{
                ...style,
                transform: mirror ? 'scaleX(-1)' : 'none',
                objectFit: objectFit,
                width: style?.width || '100%',
                height: style?.height || '100%'
            }}
        />
    );
};
