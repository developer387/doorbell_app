import React from 'react';
import { Modal } from 'react-native';
import AgoraUIKit from 'agora-rn-uikit';
import { agoraConfig } from '@/config/agora';

interface CallModalProps {
    visible: boolean;
    channelId: string;
    onClose: () => void;
}

export const CallModal = ({ visible, channelId, onClose }: CallModalProps) => {
    if (!visible) return null;

    const connectionData = {
        appId: agoraConfig.appId,
        channel: channelId,
    };

    const callbacks = {
        EndCall: () => {
            console.log('📞 Call ended');
            onClose();
        },
    };

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
        >
            <AgoraUIKit
                connectionData={connectionData}
                rtcCallbacks={callbacks}
            />
        </Modal>
    );
};
