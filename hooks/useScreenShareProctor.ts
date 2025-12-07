import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useScreenShareContextLock } from './useScreenShareContextLock';

/**
 * useScreenShareProctor
 * - Starts/stops getDisplayMedia-based monitoring
 * - Emits metadata-only proctor events via apiClient.logProctorEvent
 * - Implements Resolution-Locked Screen Sharing via useScreenShareContextLock
 */
export const useScreenShareProctor = (assignmentId: string | null, onTerminate?: () => void) => {
    const [isSharing, setIsSharing] = useState(false);
    const isSharingRef = useRef(false);

    // Use Ref for stream to keep 'stop' stable (avoiding dependency loop in parent effects)
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // Sync ref
    useEffect(() => {
        isSharingRef.current = isSharing;
    }, [isSharing]);

    // Pass the stream from ref. Note: This works because start() sets the ref 
    // AND then sets isSharing(true), triggering a re-render where we pass the new stream.
    const { violationCount } = useScreenShareContextLock(assignmentId, isSharing, mediaStreamRef.current, onTerminate);

    const safeLog = useCallback(async (eventType: string, payload: Record<string, unknown> = {}) => {
        if (!assignmentId) return;
        try {
            const res = await apiClient.logProctorEvent(assignmentId, eventType, payload);
            if (res.terminated && onTerminate) {
                onTerminate();
            }
        } catch (e) {
            console.warn('Failed to log screen proctor event:', e);
        }
    }, [assignmentId, onTerminate]);

    const stop = useCallback(() => {
        if (mediaStreamRef.current) {
            try {
                mediaStreamRef.current.getTracks().forEach(t => t.stop());
            } catch (e) {
                // ignore
            }
            mediaStreamRef.current = null;
        }

        // Use ref to check status without adding dependency
        if (isSharingRef.current) {
            safeLog('screen_share_stopped', { timestamp: new Date().toISOString() });
        }
        setIsSharing(false);
    }, [safeLog]);

    const start = useCallback(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
            safeLog('screen_share_denied', { reason: 'not_supported', timestamp: new Date().toISOString() });
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor' // Hint to prefer monitor
                },
                audio: false
            });

            mediaStreamRef.current = screenStream;
            const track = screenStream.getVideoTracks()[0];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const settings = track.getSettings ? track.getSettings() : ({} as any);

            // Emit start event with metadata
            safeLog('screen_share_started', {
                timestamp: new Date().toISOString(),
                metadata: {
                    width: settings.width,
                    height: settings.height,
                    frameRate: settings.frameRate,
                    displaySurface: settings.displaySurface // monitor, window, browser
                }
            });

            setIsSharing(true);

            track.onended = () => {
                // User stopped sharing manually or via browser UI
                // Phase 6: Continuous Sharing Rule
                safeLog('screen_share_interrupted', {
                    timestamp: new Date().toISOString(),
                    reason: 'User stopped sharing via browser UI',
                    severity: 'high'
                });
                stop();
            };
        } catch (err: unknown) {
            const reason = err instanceof Error ? err.name : 'denied';
            safeLog('screen_share_denied', { timestamp: new Date().toISOString(), reason });
            setIsSharing(false);
        }
    }, [safeLog, stop]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isSharingRef.current) stop();
        };
    }, [stop]);

    return {
        isSharing,
        start,
        stop,
        violationCount
    };
};

export default useScreenShareProctor;
