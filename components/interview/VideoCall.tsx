
import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Play, Users, Calendar, AlertCircle, Loader2, Monitor, PenTool, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, parseUTCTime } from '@/lib/utils';
import { DeviceSettings } from './DeviceSettings';
import { Whiteboard } from './Whiteboard';

interface VideoCallProps {
    roomId: string;
    userId: string;
    isInitiator: boolean;
    onLeave: () => void;
    scheduledAt?: string;
    participantName?: string;
}

export function VideoCall({ roomId, userId, isInitiator, onLeave, scheduledAt, participantName }: VideoCallProps) {
    const { user } = useAuth();
    const userRole = user?.role ?? 'candidate';
    const effectiveInitiator = isInitiator || userRole === 'recruiter';

    const {
        userVideo,
        remoteVideo,
        isConnected,
        error,
        toggleAudio,
        toggleVideo,
        createPeer,
        activeParticipants,
        switchDevice,
        currentAudioInput,
        currentVideoInput,
        currentAudioOutput,
        toggleScreenShare,
        isScreenSharing,
        socket,
        proctorEvents,
        sendProctorEvent,
        proctoringEnabled
    } = useWebRTC({
        roomId,
        userId,
        userRole,
        isInitiator: effectiveInitiator,
        enableProctoring: userRole === 'candidate' // Enable proctoring for candidates only
    });

    // --- Face Detection (Proctoring) ---
    // Only run for candidates (not initiator) and when connected
    const { isFaceMissing } = useFaceDetection({
        videoRef: userVideo,
        isActive: !isInitiator && isConnected,
        onMultipleFaces: (count) => {
            sendProctorEvent({
                type: 'multiple_faces',
                message: `Multiple faces detected (${count})`,
                room_id: roomId,
                timestamp: new Date().toISOString()
            });
        },
        onFaceMissing: (duration) => {
            // Warn if missing for > 5 seconds
            if (duration > 5) {
                sendProctorEvent({
                    type: 'face_missing',
                    message: `Face missing for ${duration.toFixed(1)}s`,
                    room_id: roomId,
                    timestamp: new Date().toISOString()
                });
            }
        }
    });

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showWhiteboard, setShowWhiteboard] = useState(false);

    // Auto-hide controls after inactivity
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, []);

    const handleToggleAudio = () => {
        toggleAudio();
        setIsMuted(!isMuted);
    };

    const handleToggleVideo = () => {
        toggleVideo();
        setIsVideoOff(!isVideoOff);
    };

    const [showLogDetails, setShowLogDetails] = useState(false);

    const formatScheduledTime = (dateString?: string) => {
        if (!dateString) return null;
        try {
            // Use local time (undefined locale uses browser default)
            return parseUTCTime(dateString)?.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short"
            });
        } catch (e) {
            return dateString;
        }
    };

    const istTime = formatScheduledTime(scheduledAt);

    return (
        <div className="relative h-full w-full bg-black overflow-hidden rounded-xl shadow-2xl border border-gray-800">
            {/* Header Info */}
            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
                {istTime && (
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-white/90 text-xs font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>Scheduled: {istTime}</span>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-destructive/90 text-white px-6 py-4 rounded-xl z-50 shadow-lg backdrop-blur-sm flex flex-col items-center gap-3 max-w-md text-center">
                    <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="w-5 h-5" />
                        <span>Connection Error</span>
                    </div>
                    <p className="text-sm opacity-90">{error}</p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="mt-1"
                    >
                        Reload Page
                    </Button>
                </div>
            )}

            {/* Connection Status Indicator */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className={cn("w-2.5 h-2.5 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500")} />
                <span className="text-xs font-medium text-white/90">
                    {isConnected ? "Connected" : "Waiting..."}
                </span>
            </div>

            {/* Remote Video (Full Screen) */}
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                <video
                    ref={remoteVideo}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
                {!isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-black/60 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <Users className="w-10 h-10 text-white/40" />
                        </div>
                        <p className="text-lg font-medium">
                            {participantName ? `Waiting for ${participantName}...` : "Waiting for participant to join..."}
                        </p>
                        <p className="text-sm text-white/30 mt-2">
                            {isInitiator ? "You are the host. Call will start automatically when participant joins." : "Please wait for the host to join."}
                        </p>
                    </div>
                )}
            </div>

            {/* Local Video (PIP) */}
            <div className="absolute bottom-24 right-6 w-48 h-36 sm:w-64 sm:h-48 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 z-30 transition-all hover:scale-105 hover:border-primary/50 group">
                <video
                    ref={userVideo}
                    autoPlay
                    playsInline
                    muted
                    className={cn("w-full h-full object-cover transition-opacity", isVideoOff ? "opacity-0" : "opacity-100")}
                />
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-medium backdrop-blur-sm z-10">
                    You
                </div>
                {/* Watermark (Phase 6) */}
                <div className="absolute top-2 left-2 opacity-30 pointer-events-none z-10">
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest">{userId}</p>
                    <p className="text-[8px] text-white font-mono">{new Date().toLocaleTimeString()}</p>
                </div>
                {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                            <VideoOff className="w-6 h-6 text-white/50" />
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className={cn(
                "absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/10 shadow-2xl z-40 transition-all duration-300",
                showControls ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
            )}>
                <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="icon"
                    className={cn("rounded-full h-14 w-14 transition-all", isMuted ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20 text-white border-0")}
                    onClick={handleToggleAudio}
                >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                <Button
                    variant={isVideoOff ? "destructive" : "secondary"}
                    size="icon"
                    className={cn("rounded-full h-14 w-14 transition-all", isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20 text-white border-0")}
                    onClick={handleToggleVideo}
                >
                    {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>

                <Button
                    variant={isScreenSharing ? "default" : "secondary"}
                    size="icon"
                    className={cn("rounded-full h-14 w-14 transition-all", isScreenSharing ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-white/10 hover:bg-white/20 text-white border-0")}
                    onClick={toggleScreenShare}
                    title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                >
                    <Monitor className="h-6 w-6" />
                </Button>

                <div className="w-px h-8 bg-white/20 mx-2" />

                <Button
                    variant={showWhiteboard ? "default" : "secondary"}
                    size="icon"
                    className={cn("rounded-full h-14 w-14 transition-all", showWhiteboard ? "bg-purple-500 hover:bg-purple-600 text-white" : "bg-white/10 hover:bg-white/20 text-white border-0")}
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    title="Whiteboard"
                >
                    <PenTool className="h-6 w-6" />
                </Button>

                <div className="w-px h-8 bg-white/20 mx-2" />

                <Button
                    onClick={async () => {
                        if (isInitiator) {
                            if (confirm("Are you sure you want to end this interview? This will delete the session.")) {
                                try {
                                    const apiClient = (await import('@/lib/api-client')).apiClient;
                                    await apiClient.delete(`/v1/interview/${roomId}`);
                                    onLeave();
                                } catch (e) {
                                    console.error("Failed to delete interview:", e);
                                    onLeave();
                                }
                            }
                        } else {
                            onLeave();
                        }
                    }}
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
                >
                    <PhoneOff className="h-6 w-6" />
                </Button>
            </div>

            {/* Device Settings (Bottom Right) */}
            <div className="absolute bottom-8 right-8 z-40">
                <DeviceSettings
                    currentAudioInput={currentAudioInput}
                    currentVideoInput={currentVideoInput}
                    currentAudioOutput={currentAudioOutput}
                    onDeviceChange={switchDevice}
                />
            </div>

            {/* Whiteboard Overlay */}
            {showWhiteboard && (
                <Whiteboard
                    roomId={roomId}
                    socket={socket}
                    onClose={() => setShowWhiteboard(false)}
                    isReadOnly={false} // Can be toggled based on role if needed
                />
            )}

            {/* Activity Log (Recruiter Only) */}
            {isInitiator && (
                <div
                    className={cn(
                        "absolute top-20 left-4 z-30 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col transition-all hover:bg-black/90",
                        showLogDetails ? "w-80 max-h-[300px]" : "w-auto max-h-[50px] cursor-pointer"
                    )}
                    onClick={() => !showLogDetails && setShowLogDetails(true)}
                >
                    <div className="p-3 border-b border-white/10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className={cn("w-4 h-4", proctorEvents.length > 0 ? "text-red-500 animate-pulse" : "text-green-500")} />
                            <span className="text-xs font-semibold text-white/90">
                                {showLogDetails ? "Activity Log" : `${proctorEvents.length} Events`}
                            </span>
                        </div>
                        {showLogDetails && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/50 hover:text-white" onClick={(e) => { e.stopPropagation(); setShowLogDetails(false); }}>
                                <span className="sr-only">Close</span>
                                &times;
                            </Button>
                        )}
                    </div>

                    {showLogDetails && (
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20">
                            {proctorEvents.length === 0 ? (
                                <p className="text-xs text-white/30 italic">No suspicious activity detected.</p>
                            ) : (
                                proctorEvents.map((event, i) => (
                                    <div key={i} className="flex gap-2 text-xs animate-in slide-in-from-left-2 duration-300">
                                        <span className="text-white/40 font-mono shrink-0">
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        <span className={cn(
                                            "font-medium",
                                            event.type === 'tab_switch' || event.type === 'window_blur' || event.type === 'print_screen' || event.type === 'virtual_device' ? "text-red-400" :
                                                event.type === 'screen_share_denied' ? "text-orange-400" :
                                                    "text-green-400"
                                        )}>
                                            {event.message || event.type}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
