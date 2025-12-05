import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import SimplePeer, { Instance } from 'simple-peer';

interface UseWebRTCProps {
    roomId: string;
    userId: string;
    isInitiator?: boolean;
}

export const useWebRTC = ({ roomId, userId, isInitiator = false }: UseWebRTCProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeParticipants, setActiveParticipants] = useState<string[]>([]);

    // Device State
    const [currentAudioInput, setCurrentAudioInput] = useState<string | undefined>();
    const [currentVideoInput, setCurrentVideoInput] = useState<string | undefined>();
    const [currentAudioOutput, setCurrentAudioOutput] = useState<string | undefined>();

    // Refs
    const socketRef = useRef<Socket | null>(null);
    const peerRef = useRef<Instance | null>(null);
    const userVideo = useRef<HTMLVideoElement | null>(null);
    const remoteVideo = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isConnectedRef = useRef(false);
    const iceCandidatesQueue = useRef<any[]>([]);
    const pendingTargetRef = useRef<string | null>(null);

    const setConnectedState = (status: boolean) => {
        setIsConnected(status);
        isConnectedRef.current = status;
    };

    const cleanupPeer = useCallback(() => {
        if (peerRef.current) {
            console.log('🧹 Cleaning up peer');
            try {
                peerRef.current.removeAllListeners();
                peerRef.current.destroy();
            } catch (err) {
                console.error('Error destroying peer:', err);
            }
            peerRef.current = null;
        }
        setConnectedState(false);
        iceCandidatesQueue.current = [];
    }, []);

    // ------------------------------------------------------------
    // Anti-Cheating (Phase 6)
    // ------------------------------------------------------------
    const checkForVirtualDevice = useCallback((label: string) => {
        const lowerLabel = label.toLowerCase();
        const suspiciousKeywords = ['virtual', 'obs', 'vb-cable', 'manycam', 'droidcam', 'iriun'];
        if (suspiciousKeywords.some(keyword => lowerLabel.includes(keyword))) {
            console.warn(`🚨 Suspicious device detected: ${label}`);
            socketRef.current?.emit('proctor_event', {
                type: 'virtual_device',
                message: `Suspicious device detected: ${label}`,
                timestamp: new Date().toISOString(),
                room_id: roomId
            });
        }
    }, [roomId]);

    // ------------------------------------------------------------
    // Device Management
    // ------------------------------------------------------------
    const switchDevice = useCallback(async (kind: MediaDeviceKind, deviceId: string) => {
        console.log(`🔄 Switching ${kind} to ${deviceId}`);

        // Check for virtual device (Phase 6)
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const device = devices.find(d => d.deviceId === deviceId);
            if (device && device.label) {
                checkForVirtualDevice(device.label);
            }
        } catch (e) {
            console.error("Error checking device label:", e);
        }

        try {
            if (kind === 'audiooutput') {
                // Handle Speaker Change
                if (remoteVideo.current && (remoteVideo.current as any).setSinkId) {
                    await (remoteVideo.current as any).setSinkId(deviceId);
                    setCurrentAudioOutput(deviceId);
                }
                return;
            }

            // Handle Input Change (Mic/Camera)
            const constraints: MediaStreamConstraints = {
                audio: kind === 'audioinput' ? { deviceId: { exact: deviceId } } : undefined,
                video: kind === 'videoinput' ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : undefined
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newTrack = kind === 'audioinput' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0];

            if (streamRef.current) {
                const oldTrack = kind === 'audioinput'
                    ? streamRef.current.getAudioTracks()[0]
                    : streamRef.current.getVideoTracks()[0];

                if (oldTrack) {
                    oldTrack.stop();
                    streamRef.current.removeTrack(oldTrack);
                }
                streamRef.current.addTrack(newTrack);

                // Update Local Video
                if (userVideo.current) {
                    userVideo.current.srcObject = streamRef.current;
                }

                // Update Peer Connection
                if (peerRef.current) {
                    console.log(`📡 Replacing ${kind} track in peer connection`);
                    peerRef.current.replaceTrack(oldTrack, newTrack, streamRef.current);
                }

                // Update State
                if (kind === 'audioinput') setCurrentAudioInput(deviceId);
                if (kind === 'videoinput') setCurrentVideoInput(deviceId);
            }
        } catch (err) {
            console.error(`❌ Failed to switch ${kind}:`, err);
            setError(`Failed to switch device: ${err}`);
        }
    }, [checkForVirtualDevice]);

    // ------------------------------------------------------------
    // Peer Creation
    // ------------------------------------------------------------
    const createPeer = useCallback((targetSid: string) => {
        if (peerRef.current) {
            if (!isConnectedRef.current) {
                cleanupPeer();
            } else {
                return;
            }
        }

        if (!streamRef.current) {
            console.warn('⏳ Stream not ready, queuing peer creation');
            pendingTargetRef.current = targetSid;
            return;
        }

        console.log('🔵 Creating peer (initiator), target:', targetSid);

        const peer = new SimplePeer({
            initiator: true,
            trickle: true,
            stream: streamRef.current,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peer.on('signal', (data) => {
            if (data.type === 'offer') {
                socketRef.current?.emit('offer', {
                    sdp: data,
                    room_id: roomId,
                    target_sid: targetSid
                });
            } else if ((data as any).candidate) {
                socketRef.current?.emit('ice_candidate', {
                    candidate: (data as any).candidate,
                    target_sid: targetSid
                });
            }
        });

        peer.on('stream', (remoteStream) => {
            if (remoteVideo.current) {
                remoteVideo.current.srcObject = remoteStream;
            }
        });

        peer.on('connect', () => {
            console.log('✅ Peer connected');
            setConnectedState(true);
            setError(null);
        });

        peer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            setError(`Connection failed: ${err.message}`);
        });

        peer.on('close', () => {
            cleanupPeer();
        });

        peerRef.current = peer;
        pendingTargetRef.current = null;
    }, [roomId, cleanupPeer]);

    // ------------------------------------------------------------
    // Signal Handlers
    // ------------------------------------------------------------
    const handleReceiveOffer = useCallback((data: { sdp: SimplePeer.SignalData, sender_sid: string }) => {
        if (peerRef.current) cleanupPeer();

        if (!streamRef.current) {
            console.error('❌ Cannot accept offer: no stream');
            return;
        }

        console.log('🟢 Creating peer (receiver) from:', data.sender_sid);

        const peer = new SimplePeer({
            initiator: false,
            trickle: true,
            stream: streamRef.current,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peer.on('signal', (signalData) => {
            if (signalData.type === 'answer') {
                socketRef.current?.emit('answer', {
                    sdp: signalData,
                    target_sid: data.sender_sid
                });
            } else if ((signalData as any).candidate) {
                socketRef.current?.emit('ice_candidate', {
                    candidate: (signalData as any).candidate,
                    target_sid: data.sender_sid
                });
            }
        });

        peer.on('stream', (remoteStream) => {
            if (remoteVideo.current) {
                remoteVideo.current.srcObject = remoteStream;
            }
        });

        peer.on('connect', () => {
            setConnectedState(true);
            setError(null);
        });

        peer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            setError(`Connection failed: ${err.message}`);
        });

        peer.on('close', () => cleanupPeer());

        peer.signal(data.sdp);
        peerRef.current = peer;

        // Process queued ICE candidates
        if (iceCandidatesQueue.current.length > 0) {
            iceCandidatesQueue.current.forEach(c => peer.signal({ type: 'candidate', candidate: c } as any));
            iceCandidatesQueue.current = [];
        }
    }, [cleanupPeer]);

    const handleReceiveAnswer = useCallback((data: { sdp: SimplePeer.SignalData }) => {
        peerRef.current?.signal(data.sdp);
    }, []);

    const handleReceiveIceCandidate = useCallback((data: { candidate: any }) => {
        if (peerRef.current) {
            peerRef.current.signal({ type: 'candidate', candidate: data.candidate } as any);
        } else {
            iceCandidatesQueue.current.push(data.candidate);
        }
    }, []);

    // ------------------------------------------------------------
    // Initialization
    // ------------------------------------------------------------
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                // 1. Get Media FIRST
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: { echoCancellation: true, noiseSuppression: true }
                });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (userVideo.current) userVideo.current.srcObject = stream;

                // Set initial devices
                const tracks = stream.getTracks();
                const audioTrack = tracks.find(t => t.kind === 'audio');
                const videoTrack = tracks.find(t => t.kind === 'video');
                if (audioTrack) {
                    setCurrentAudioInput(audioTrack.getSettings().deviceId);
                    if (audioTrack.label) checkForVirtualDevice(audioTrack.label);
                }
                if (videoTrack) {
                    setCurrentVideoInput(videoTrack.getSettings().deviceId);
                    if (videoTrack.label) checkForVirtualDevice(videoTrack.label);
                }

                // 2. Connect Socket
                let socketUrl = 'http://localhost:8000';
                if (process.env.NEXT_PUBLIC_API_BASE_URL) {
                    const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL);
                    socketUrl = `${url.protocol}//${url.host}`;
                }

                socketRef.current = io(socketUrl, {
                    path: '/socket.io/',
                    transports: ['websocket', 'polling']
                });

                socketRef.current.on('connect', () => {
                    console.log('✅ Socket connected');
                    socketRef.current?.emit('join_room', { room_id: roomId });
                });

                socketRef.current.on('user_joined', ({ sid }) => {
                    console.log('👤 User joined:', sid);
                    if (isInitiator) createPeer(sid);
                });

                socketRef.current.on('existing_participants', ({ participants }) => {
                    console.log('👥 Existing participants:', participants);
                    if (isInitiator && participants.length > 0) {
                        createPeer(participants[0]);
                    }
                });

                socketRef.current.on('offer', handleReceiveOffer);
                socketRef.current.on('answer', handleReceiveAnswer);
                socketRef.current.on('ice_candidate', handleReceiveIceCandidate);
                socketRef.current.on('user_left', ({ sid }) => {
                    if (isConnectedRef.current) cleanupPeer();
                });

            } catch (err: any) {
                console.error('❌ Init error:', err);
                if (mounted) setError(err.message || 'Failed to initialize');
            }
        };

        init();

        return () => {
            mounted = false;
            streamRef.current?.getTracks().forEach(t => t.stop());
            socketRef.current?.disconnect();
            if (peerRef.current) peerRef.current.destroy();
        };
    }, [roomId, userId, isInitiator, createPeer, handleReceiveOffer, handleReceiveAnswer, handleReceiveIceCandidate, cleanupPeer, checkForVirtualDevice]);

    const toggleAudio = useCallback(() => {
        streamRef.current?.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
    }, []);

    const toggleVideo = useCallback(() => {
        streamRef.current?.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
    }, []);

    // ------------------------------------------------------------
    // Proctoring
    // ------------------------------------------------------------
    const [proctorEvents, setProctorEvents] = useState<any[]>([]);

    useEffect(() => {
        if (!socketRef.current) return;

        const handleProctorEvent = (data: any) => {
            console.log('🚨 Proctor Event:', data);
            setProctorEvents(prev => [data, ...prev]);
        };

        socketRef.current.on('proctor_event', handleProctorEvent);

        return () => {
            socketRef.current?.off('proctor_event', handleProctorEvent);
        };
    }, []);

    useEffect(() => {
        if (!isConnected || isInitiator || !socketRef.current) return; // Only monitor candidates

        const handleVisibilityChange = () => {
            if (document.hidden) {
                socketRef.current?.emit('proctor_event', {
                    type: 'tab_switch',
                    message: 'Candidate switched tab',
                    timestamp: new Date().toISOString(),
                    room_id: roomId
                });
            } else {
                socketRef.current?.emit('proctor_event', {
                    type: 'tab_return',
                    message: 'Candidate returned to tab',
                    timestamp: new Date().toISOString(),
                    room_id: roomId
                });
            }
        };

        const handleBlur = () => {
            socketRef.current?.emit('proctor_event', {
                type: 'window_blur',
                message: 'Candidate minimized window / lost focus',
                timestamp: new Date().toISOString(),
                room_id: roomId
            });
        };

        const handleFocus = () => {
            socketRef.current?.emit('proctor_event', {
                type: 'window_focus',
                message: 'Candidate focused window',
                timestamp: new Date().toISOString(),
                room_id: roomId
            });
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen') {
                console.log('🚨 PrintScreen Detected');
                socketRef.current?.emit('proctor_event', {
                    type: 'print_screen',
                    message: 'Candidate took a screenshot (PrintScreen)',
                    timestamp: new Date().toISOString(),
                    room_id: roomId
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isConnected, isInitiator, roomId]);

    // ------------------------------------------------------------
    // Screen Sharing
    // ------------------------------------------------------------
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef<MediaStream | null>(null);

    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            // STOP Sharing
            stopScreenShare();
        } else {
            // START Sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false // System audio sharing is tricky, keeping it simple for now
                });

                const screenTrack = screenStream.getVideoTracks()[0];

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                if (streamRef.current && peerRef.current) {
                    const videoTrack = streamRef.current.getVideoTracks()[0];
                    console.log('🔄 Replacing Video Track with Screen Track');
                    peerRef.current.replaceTrack(videoTrack, screenTrack, streamRef.current);

                    // Update local preview to show what we are sharing
                    if (userVideo.current) {
                        userVideo.current.srcObject = screenStream;
                    }
                }

                screenStreamRef.current = screenStream;
                setIsScreenSharing(true);

            } catch (err: any) {
                console.error("❌ Screen share cancelled/failed:", err);
                if (err.name === 'NotAllowedError') {
                    // Emit proctoring event
                    socketRef.current?.emit('proctor_event', {
                        type: 'screen_share_denied',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
    }, [isScreenSharing]);

    const stopScreenShare = useCallback(() => {
        console.log('⏹️ Stopping Screen Share');
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());

            // Revert to Camera
            if (streamRef.current && peerRef.current) {
                const screenTrack = screenStreamRef.current.getVideoTracks()[0];
                const cameraTrack = streamRef.current.getVideoTracks()[0];

                console.log('🔄 Reverting to Camera Track');
                // Note: We need to pass the *original* stream to replaceTrack
                peerRef.current.replaceTrack(screenTrack, cameraTrack, streamRef.current);

                // Restore local preview
                if (userVideo.current) {
                    userVideo.current.srcObject = streamRef.current;
                }
            }
            screenStreamRef.current = null;
        }
        setIsScreenSharing(false);
    }, []);

    // Cleanup screen share on unmount
    useEffect(() => {
        return () => {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    return {
        userVideo,
        remoteVideo,
        isConnected,
        error,
        toggleAudio,
        toggleVideo,
        switchDevice,
        currentAudioInput,
        currentVideoInput,
        currentAudioOutput,
        toggleScreenShare,
        isScreenSharing,
        socket: socketRef.current,
        proctorEvents
    };
};