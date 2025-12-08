import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import SimplePeer, { Instance } from 'simple-peer';

interface UseWebRTCProps {
    roomId: string;
    userId?: string;
    userRole?: string;
    isInitiator?: boolean;
    enableProctoring?: boolean; // if true, emit proctor_event messages
}

export const useWebRTC = ({ roomId, userId, userRole, isInitiator = false, enableProctoring = false }: UseWebRTCProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);
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
    const answerQueueRef = useRef<Array<{ sender: string; sdp: SimplePeer.SignalData }>>([]);
    const createPeerRef = useRef<((targetSid: string, incomingSignal?: SimplePeer.SignalData) => void) | null>(null);
    const retryCountsRef = useRef<Record<string, number>>({});
    const retryTimersRef = useRef<Record<string, any>>({});
    const currentTargetRef = useRef<string | null>(null);
    const MAX_HANDSHAKE_RETRIES = 4;
    const peerInitiatorRef = useRef<boolean | null>(null);
    const pendingOfferHashRef = useRef<Record<string, string>>({});
    const appliedAnswerHashRef = useRef<Record<string, string>>({});
    const creatingTargetRef = useRef<Record<string, boolean>>({});

    // Proctoring State
    const [proctorEvents, setProctorEvents] = useState<any[]>([]);

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
        // clear any handshake retry timers
        try {
            Object.values(retryTimersRef.current).forEach((t) => clearTimeout(t));
        } catch (e) { }
        retryTimersRef.current = {};
        retryCountsRef.current = {};
        currentTargetRef.current = null;
        setConnectedState(false);
        iceCandidatesQueue.current = [];
    }, []);

    const clearHandshakeRetries = useCallback((targetSid?: string | null) => {
        if (!targetSid) return;
        try {
            const t = retryTimersRef.current[targetSid];
            if (t) clearTimeout(t);
            delete retryTimersRef.current[targetSid];
            delete retryCountsRef.current[targetSid];
        } catch (e) { }
    }, []);

    const scheduleHandshakeRetry = useCallback((targetSid: string) => {
        const prev = retryCountsRef.current[targetSid] || 0;
        const attempt = prev + 1;
        retryCountsRef.current[targetSid] = attempt;

        if (attempt > MAX_HANDSHAKE_RETRIES) {
            console.warn(`✖️ Handshake max retries reached for ${targetSid}`);
            return;
        }

        const delay = Math.min(5000, 500 * Math.pow(2, attempt - 1));
        console.log(`⏱️ Scheduling handshake retry #${attempt} for ${targetSid} in ${delay}ms`);

        retryTimersRef.current[targetSid] = setTimeout(() => {
            // Only retry if still targeting this participant and not connected
            if (currentTargetRef.current !== targetSid) return;
            if (isConnectedRef.current) {
                clearHandshakeRetries(targetSid);
                return;
            }

            // CRITICAL FIX: Check signaling state before destroying peer
            // If peer is waiting for answer (have-local-offer), don't destroy it!
            if (peerRef.current) {
                try {
                    const pc = (peerRef.current as any)?._pc;
                    const state = pc?.signalingState;
                    if (state === 'have-local-offer') {
                        console.log(`   ⏳ Peer in 'have-local-offer' state, waiting for answer... (not retrying)`);
                        // Schedule another check without recreating
                        if (retryCountsRef.current[targetSid] < MAX_HANDSHAKE_RETRIES) {
                            retryCountsRef.current[targetSid] = attempt; // Don't increment
                            scheduleHandshakeRetry(targetSid);
                        }
                        return;
                    }
                } catch (e) {
                    // Couldn't check state, proceed with retry
                }
            }

            console.warn(`🔁 Handshake retry attempt ${attempt} for ${targetSid}`);
            // Recreate peer as initiator to force a fresh offer
            try {
                // destroy existing peer if any
                if (peerRef.current) {
                    try { peerRef.current.removeAllListeners(); peerRef.current.destroy(); } catch (e) { }
                    peerRef.current = null;
                }
                // Create a fresh peer (initiator) via ref
                try { createPeerRef.current?.(targetSid); } catch (e) { console.error('❌ Error calling createPeerRef:', e); }
            } catch (e) {
                console.error('❌ Error during handshake retry createPeer:', e);
            }

            // schedule next retry if we haven't hit limit
            if (retryCountsRef.current[targetSid] < MAX_HANDSHAKE_RETRIES) {
                scheduleHandshakeRetry(targetSid);
            }
        }, delay);
    }, [clearHandshakeRetries]);

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

            // If switching video, keep audio track; if switching audio, keep video track
            if (streamRef.current) {
                if (kind === 'videoinput') {
                    const audioTrack = streamRef.current.getAudioTracks()[0];
                    if (audioTrack) {
                        // @ts-ignore
                        constraints.audio = { deviceId: { exact: audioTrack.getSettings().deviceId } };
                    }
                } else if (kind === 'audioinput') {
                    const videoTrack = streamRef.current.getVideoTracks()[0];
                    if (videoTrack) {
                        // @ts-ignore
                        constraints.video = { deviceId: { exact: videoTrack.getSettings().deviceId } };
                    }
                }
            }

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Replace tracks in Peer Connection
            if (peerRef.current && streamRef.current) {
                const oldTrack = kind === 'videoinput'
                    ? streamRef.current.getVideoTracks()[0]
                    : streamRef.current.getAudioTracks()[0];

                const newTrack = kind === 'videoinput'
                    ? newStream.getVideoTracks()[0]
                    : newStream.getAudioTracks()[0];

                if (oldTrack && newTrack) {
                    console.log(`Replacing track: ${oldTrack.id} -> ${newTrack.id}`);
                    peerRef.current.replaceTrack(oldTrack, newTrack, streamRef.current);
                }
            }

            // Update Local Stream
            streamRef.current = newStream;
            if (userVideo.current) {
                userVideo.current.srcObject = newStream;
            }

            // Update State
            if (kind === 'audioinput') setCurrentAudioInput(deviceId);
            if (kind === 'videoinput') setCurrentVideoInput(deviceId);

        } catch (err: any) {
            console.error(`❌ Failed to switch ${kind}:`, err);
            setError(`Failed to switch device: ${err.message}`);
        }
    }, [checkForVirtualDevice]);

    // ------------------------------------------------------------
    // Peer Connection Logic
    // ------------------------------------------------------------
    const createPeer = useCallback((targetSid: string, incomingSignal?: SimplePeer.SignalData) => {
        if (!targetSid) {
            console.warn('⚠️ createPeer called with undefined targetSid — aborting');
            return;
        }

        // mark pending target to avoid duplicate create attempts
        pendingTargetRef.current = targetSid;

        console.log(`🛠️ Creating Peer. Initiator: ${!incomingSignal}, Target: ${targetSid}`);

        if (peerRef.current) {
            console.warn('⚠️ Peer already exists, destroying old one');
            try { peerRef.current.removeAllListeners(); peerRef.current.destroy(); } catch (e) { }
        }

        const initiator = !incomingSignal;
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: streamRef.current || undefined,
            // PERFORMANCE: Multiple STUN servers for faster ICE gathering
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10 // Pre-gather candidates for faster connection
            }
        });

        // remember whether this peer was created as initiator
        peerInitiatorRef.current = initiator;
        // mark that we're creating for this target (debounce)
        creatingTargetRef.current[targetSid] = true;

        peer.on('signal', (signal) => {
            if (signal.type === 'offer') {
                console.log(`📤 SENDING OFFER to ${targetSid}`);
                socketRef.current?.emit('offer', { sdp: signal, target_sid: targetSid, room_id: roomId });
            } else if (signal.type === 'answer') {
                console.log(`📤 SENDING ANSWER to ${targetSid} - VIDEO STREAM IMMINENT`);
                socketRef.current?.emit('answer', { sdp: signal, target_sid: targetSid, room_id: roomId });
            } else if (signal.type === 'candidate') {
                socketRef.current?.emit('ice_candidate', { candidate: signal.candidate, target_sid: targetSid, room_id: roomId });
            }
        });

        peer.on('stream', (remoteStream) => {
            console.log('🎥 ✅ REMOTE VIDEO STREAM RECEIVED - VIDEO PLAYING NOW');
            if (remoteVideo.current) {
                remoteVideo.current.srcObject = remoteStream;
                remoteVideo.current.play().catch(e => console.error('Failed to play remote video:', e));
            }
            setConnectedState(true);
        });

        peer.on('connect', () => {
            console.log('🤝 WEBRTC CONNECTION ESTABLISHED - INTERVIEW READY');
            setConnectedState(true);
            // Clear handshake retries for this target
            try { clearHandshakeRetries(targetSid); } catch (e) { }
        });

        peer.on('error', (err) => {
            // Only log if not a normal user-initiated close
            if (err && err.message && !err.message.includes('User-Initiated Abort')) {
                console.error('❌ Peer error:', err);
                setError(`Connection failed: ${err.message}`);
            }
        });

        peer.on('close', () => {
            console.log('📴 Peer closed (normal end)');
            cleanupPeer();
        });

        if (incomingSignal) {
            peer.signal(incomingSignal);
        }

        peerRef.current = peer;
        // expose createPeer via ref for retry logic
        createPeerRef.current = (t: string, s?: SimplePeer.SignalData) => createPeer(t, s);
        // Track current target for retry logic
        currentTargetRef.current = targetSid;

        if (initiator) {
            // If this is the first attempt, start the retry scheduler
            if (!retryCountsRef.current[targetSid]) {
                retryCountsRef.current[targetSid] = 0;
                scheduleHandshakeRetry(targetSid);
            }
        }

        // clear creating flag after short debounce window
        setTimeout(() => { delete creatingTargetRef.current[targetSid]; }, 1500);
        // expose createPeer via ref for retry logic
        createPeerRef.current = (t: string, s?: SimplePeer.SignalData) => createPeer(t, s);

        // Process any queued answers that match this target
        if (answerQueueRef.current.length > 0) {
            const remaining: typeof answerQueueRef.current = [];
            answerQueueRef.current.forEach(item => {
                if (item.sender === targetSid) {
                    try {
                        // Only apply answer if pc is expecting it
                        const pc = (peer as any)?._pc;
                        const state = pc?.signalingState;
                        if (state === 'stable') {
                            // Not ready to accept answer yet; keep it queued
                            remaining.push(item);
                            return;
                        }

                        console.log(`📥 Applying queued answer from ${item.sender}`);
                        peer.signal(item.sdp);
                    } catch (e) {
                        console.warn('Failed to apply queued answer, re-queueing:', e);
                        remaining.push(item);
                    }
                } else {
                    remaining.push(item);
                }
            });
            answerQueueRef.current = remaining;
        }

        // Process queued ICE candidates
        if (iceCandidatesQueue.current.length > 0) {
            iceCandidatesQueue.current.forEach(c => peer.signal({ type: 'candidate', candidate: c } as any));
            iceCandidatesQueue.current = [];
        }

        // clear pending target after a short delay (peer creation settled)
        setTimeout(() => {
            if (pendingTargetRef.current === targetSid) pendingTargetRef.current = null;
        }, 1200);
    }, [cleanupPeer, roomId]);

    const handleReceiveOffer = useCallback((data: any) => {
        const sender = data?.sender_sid || data?.sid || data?.from || data?.sender;
        const sdp = data?.sdp;
        if (!sender) {
            console.warn('⚠️ Offer received with no sender identifier - ignoring');
            return;
        }

        // Deduplicate identical offers
        try {
            const hash = JSON.stringify(sdp);
            if (pendingOfferHashRef.current[sender] === hash) return;
            pendingOfferHashRef.current[sender] = hash;
        } catch (e) {
            // ignore hashing errors
        }

        console.log('📩 Received Offer from:', sender);

        // If a peer already exists:
        // - If we are non-initiator, apply the offer to the existing peer via signal
        // - If we are initiator, ignore to avoid collision (recruiter initiator deterministic)
        if (peerRef.current) {
            if (peerInitiatorRef.current === false) {
                try {
                    console.log(`   ▶️ Applying incoming offer to existing non-initiator peer from ${sender}`);
                    peerRef.current.signal(sdp);
                } catch (e) {
                    console.warn('⚠️ Failed to apply incoming offer to existing peer, recreating peer as fallback:', e);
                    if (!creatingTargetRef.current[sender]) createPeer(sender, sdp);
                }
                return;
            }

            console.warn('⚠️ Offer received while local peer is initiator — ignoring to avoid collision');
            return;
        }

        // Debounce duplicate create attempts for the same sender
        if (creatingTargetRef.current[sender]) {
            console.log(`⏳ Already creating peer for ${sender} — ignoring duplicate offer`);
            return;
        }

        // Clear pending target since we're now processing the offer
        if (pendingTargetRef.current === sender) {
            pendingTargetRef.current = null;
        }

        console.log(`   ✅ Creating peer as NON-INITIATOR to answer offer from ${sender}`);
        createPeer(sender, sdp);
    }, []);

    const handleReceiveAnswer = useCallback((data: any) => {
        const sender = data?.sender_sid || data?.sid || data?.from || data?.sender;
        const sdp = data?.sdp;
        if (!sender) {
            console.warn('⚠️ Answer received with no sender identifier - ignoring');
            return;
        }

        // Deduplicate identical answers to avoid setLocalDescription errors
        try {
            const hash = JSON.stringify(sdp);
            if (appliedAnswerHashRef.current[sender] === hash) return;
            appliedAnswerHashRef.current[sender] = hash;
        } catch (e) {
            // ignore hashing errors
        }

        console.log(`📨 Received Answer from ${sender} - CONNECTING VIDEO STREAM`);

        if (peerRef.current) {
            // Inspect underlying RTCPeerConnection state to avoid wrong-state applies
            try {
                const pc = (peerRef.current as any)?._pc;
                const state = pc?.signalingState;
                if (state === 'stable') {
                    console.warn('⚠️ Peer in stable state; queuing answer to avoid wrong-state apply', sender);
                    answerQueueRef.current.push({ sender, sdp });
                    return;
                }
            } catch (e) {
                // couldn't inspect pc - fallthrough to try applying answer
            }

            try {
                peerRef.current.signal(sdp);
            } catch (e) {
                console.error('❌ Failed to apply answer signal:', e);
                // Re-queue when applying fails
                answerQueueRef.current.push({ sender, sdp });
            }
            return;
        }

        // Queue the answer until peer is created for that sender
        console.warn('⚠️ Peer not yet created, queueing answer for', sender);
        answerQueueRef.current.push({ sender, sdp });
    }, []);

    const handleReceiveIceCandidate = useCallback((data: any) => {
        const candidate = data?.candidate;
        if (!candidate) return;
        if (peerRef.current) {
            try {
                peerRef.current.signal({ type: 'candidate', candidate } as any);
            } catch (e) {
                console.error('❌ Failed to apply ICE candidate:', e);
            }
        } else {
            iceCandidatesQueue.current.push(candidate);
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
                let socketUrl = '';
                if (process.env.NEXT_PUBLIC_API_BASE_URL) {
                    const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL);
                    socketUrl = `${url.protocol}//${url.host}`;
                } else {
                    console.error("Missing NEXT_PUBLIC_API_BASE_URL for socket connection");
                    return;
                }

                // PERFORMANCE: Force websocket-only for faster initial connection
                socketRef.current = io(socketUrl, {
                    path: '/socket.io/',
                    transports: ['websocket'], // Skip polling, websocket is faster
                    upgrade: false, // Don't try to upgrade, stay on websocket
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000
                });

                socketRef.current.on('connect', () => {
                    console.log('✅ Socket connected');
                    // Send authenticated user info so backend can authorize join
                    socketRef.current?.emit('join_room', { room_id: roomId, user_id: userId, user_role: userRole });
                });

                // Handle authorization rejection from server
                socketRef.current.on('join_denied', (payload: { reason?: string }) => {
                    const reason = payload?.reason || 'unauthorized';
                    let friendly = 'You are not authorized to join this interview.';
                    switch (reason) {
                        case 'missing_room_id':
                            friendly = 'Interview ID missing. Please retry from your interview link.';
                            break;
                        case 'missing_auth':
                            friendly = 'Authentication information missing. Please sign in and try again.';
                            break;
                        case 'invalid_user_id':
                            friendly = 'Invalid user. Please re-login and try again.';
                            break;
                        case 'room_not_found':
                            friendly = 'Interview not found or it may have been cancelled.';
                            break;
                        case 'db_error':
                            friendly = 'Server error validating interview. Please try again later.';
                            break;
                        case 'unauthorized':
                        default:
                            friendly = 'You are not authorized to join this interview.';
                            break;
                    }

                    console.warn('🚫 Join denied:', reason);
                    setJoinError(friendly);
                    setError(friendly);

                    // Clean up local media and disconnect socket to prevent retry storm
                    try {
                        streamRef.current?.getTracks().forEach(t => t.stop());
                    } catch (e) {
                        // ignore
                    }

                    // Allow UI to observe error, then disconnect
                    setTimeout(() => {
                        try {
                            socketRef.current?.disconnect();
                        } catch (e) { }
                    }, 250);
                });

                socketRef.current.on('user_joined', ({ sid }) => {
                    console.log(`👤 User joined: ${sid} - ${isInitiator ? 'INITIATING OFFER' : 'WAITING FOR OFFER'}`);
                    if (isInitiator) {
                        console.log('   🚀 Immediately creating peer for video stream');
                        createPeer(sid);
                    }
                });

                socketRef.current.on('existing_participants', ({ participants }) => {
                    console.log(`👥 Existing participants: ${participants.join(', ')}`);
                    // GLARE FIX: Only the designated initiator (recruiter) creates the peer
                    // The candidate waits for the offer to avoid collision
                    if (isInitiator && participants.length > 0) {
                        console.log(`   🚀 Initiator creating peer with first participant`);
                        createPeer(participants[0]);
                    } else if (participants.length > 0) {
                        console.log(`   ⏳ Non-initiator waiting for offer from: ${participants[0]}`);
                        // Store target so we can create peer when offer arrives
                        pendingTargetRef.current = participants[0];
                    }
                });

                socketRef.current.on('offer', handleReceiveOffer);
                socketRef.current.on('answer', handleReceiveAnswer);
                socketRef.current.on('ice_candidate', handleReceiveIceCandidate);
                socketRef.current.on('user_left', ({ sid }) => {
                    if (isConnectedRef.current) cleanupPeer();
                });

                // Attach Proctor Event Listener
                socketRef.current.on('proctor_event', (data: any) => {
                    console.log('🚨 Proctor Event:', data);
                    setProctorEvents(prev => [data, ...prev]);
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
            if (!enableProctoring) return;
            socketRef.current?.emit('proctor_event', {
                type: 'window_blur',
                message: 'Candidate minimized window / lost focus',
                timestamp: new Date().toISOString(),
                room_id: roomId
            });
        };

        const handleFocus = () => {
            if (!enableProctoring) return;
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
                if (!enableProctoring) return;
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
                    video: { cursor: 'always' } as any,
                    audio: false
                });

                const screenTrack = screenStream.getVideoTracks()[0];
                const settings = screenTrack.getSettings();

                // 1. Emit Start Event
                if (enableProctoring) {
                    socketRef.current?.emit('proctor_event', {
                        type: 'screen_share_started',
                        message: 'Screen share started',
                        timestamp: new Date().toISOString(),
                        room_id: roomId,
                        metadata: {
                            width: settings.width,
                            height: settings.height,
                            frameRate: settings.frameRate
                        }
                    });
                }

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                if (streamRef.current && peerRef.current) {
                    const videoTrack = streamRef.current.getVideoTracks()[0];
                    console.log('🔄 Replacing Video Track with Screen Track');
                    peerRef.current.replaceTrack(videoTrack, screenTrack, streamRef.current);

                    // Update local preview
                    if (userVideo.current) {
                        userVideo.current.srcObject = screenStream;
                    }
                }

                screenStreamRef.current = screenStream;
                setIsScreenSharing(true);

            } catch (err: any) {
                console.error("❌ Screen share cancelled/failed:", err);
                if (err.name === 'NotAllowedError') {
                    socketRef.current?.emit('proctor_event', {
                        type: 'screen_share_denied',
                        timestamp: new Date().toISOString(),
                        room_id: roomId
                    });
                }
            }
        }
    }, [isScreenSharing, roomId]);

    const stopScreenShare = useCallback(() => {
        console.log('⏹️ Stopping Screen Share');
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());

            // 2. Emit Stop Event
            if (enableProctoring) {
                socketRef.current?.emit('proctor_event', {
                    type: 'screen_share_stopped',
                    message: 'Screen share stopped',
                    timestamp: new Date().toISOString(),
                    room_id: roomId
                });
            }

            // Revert to Camera
            if (streamRef.current && peerRef.current) {
                const screenTrack = screenStreamRef.current.getVideoTracks()[0];
                const cameraTrack = streamRef.current.getVideoTracks()[0];

                console.log('🔄 Reverting to Camera Track');
                peerRef.current.replaceTrack(screenTrack, cameraTrack, streamRef.current);

                // Restore local preview
                if (userVideo.current) {
                    userVideo.current.srcObject = streamRef.current;
                }
            }
            screenStreamRef.current = null;
        }
        setIsScreenSharing(false);
    }, [roomId]);

    // ------------------------------------------------------------
    // Metadata Poller (Phase 3)
    // ------------------------------------------------------------
    useEffect(() => {
        if (!isScreenSharing || !screenStreamRef.current) return;

        const track = screenStreamRef.current.getVideoTracks()[0];
        let lastSettings = track.getSettings();

        const interval = setInterval(() => {
            const currentSettings = track.getSettings();

            // 3. Detect Monitor/Resolution Change
            if (currentSettings.width !== lastSettings.width || currentSettings.height !== lastSettings.height) {
                socketRef.current?.emit('proctor_event', {
                    type: 'screen_monitor_changed',
                    message: 'Screen resolution changed (Monitor switch?)',
                    timestamp: new Date().toISOString(),
                    room_id: roomId,
                    metadata: {
                        old_res: `${lastSettings.width}x${lastSettings.height}`,
                        new_res: `${currentSettings.width}x${currentSettings.height}`
                    }
                });
                lastSettings = currentSettings;
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isScreenSharing, roomId]);

    // Cleanup screen share on unmount
    useEffect(() => {
        return () => {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Helper to safely emit proctor events (no-ops when disabled)
    const sendProctorEvent = useCallback((payload: any) => {
        if (!enableProctoring) return;
        try {
            socketRef.current?.emit('proctor_event', payload);
        } catch (e) {
            console.warn('Failed to send proctor_event:', e);
        }
    }, [enableProctoring]);

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
        proctorEvents,
        createPeer,
        activeParticipants,
        // expose helper and flag
        sendProctorEvent,
        proctoringEnabled: enableProctoring
    };
};