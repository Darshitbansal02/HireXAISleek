import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface ScreenBaseline {
    width: number;
    height: number;
    aspectRatio: number;
    pixelRatio: number;
    viewport: { width: number; height: number };
    // Strict Enforcement Fields
    label: string;
    displaySurface?: string;
    frameRate?: number;
    id: string; // track ID
}

export const useScreenShareContextLock = (
    assignmentId: string | null,
    isSharing: boolean,
    mediaStream: MediaStream | null,
    onTerminate?: () => void
) => {
    const baselineRef = useRef<ScreenBaseline | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [violationCount, setViolationCount] = useState(0);

    const log = useCallback(async (event: string, payload: Record<string, unknown>) => {
        if (!assignmentId) return;
        try {
            const res = await apiClient.logProctorEvent(assignmentId, event, payload);
            if (res.terminated && onTerminate) {
                onTerminate();
            }
        } catch (e) {
            console.error(e);
        }
    }, [assignmentId, onTerminate]);

    useEffect(() => {
        if (!isSharing || !mediaStream) {
            baselineRef.current = null;
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        const track = mediaStream.getVideoTracks()[0];
        if (!track) return;

        // 1. Capture Baseline
        const settings = track.getSettings();
        const width = settings.width || 0;
        const height = settings.height || 0;

        if (width > 0 && height > 0) {
            baselineRef.current = {
                width,
                height,
                aspectRatio: width / height,
                pixelRatio: window.devicePixelRatio || 1,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                // Strict fields
                label: track.label,
                id: track.id,
                displaySurface: settings.displaySurface,
                frameRate: settings.frameRate
            };

            log('screen_context_baseline_locked', {
                timestamp: new Date().toISOString(),
                baseline: baselineRef.current as unknown as Record<string, unknown>
            });
        }

        // 2. Start Monitoring
        intervalRef.current = setInterval(() => {
            if (!baselineRef.current) return;
            const currentTrack = mediaStream.getVideoTracks()[0]; // Re-fetch to check if track replaced
            if (!currentTrack) return;

            const currentSettings = currentTrack.getSettings() || {};
            const curWidth = currentSettings.width || 0;
            const curHeight = currentSettings.height || 0;
            const curAspect = (curWidth > 0 && curHeight > 0) ? curWidth / curHeight : 0;

            // Checks - Strict Mode
            const widthDiff = Math.abs(curWidth - baselineRef.current.width);
            const heightDiff = Math.abs(curHeight - baselineRef.current.height);
            const isResChanged = (widthDiff / baselineRef.current.width > 0.05) || (heightDiff / baselineRef.current.height > 0.05); // Tighter 5% tolerance
            const isLabelChanged = currentTrack.label !== baselineRef.current.label;
            const isSurfaceChanged = currentSettings.displaySurface !== baselineRef.current.displaySurface && !!baselineRef.current.displaySurface;

            // Critical Violation
            if (isResChanged || isLabelChanged || isSurfaceChanged) {
                setViolationCount(prev => prev + 1);
                log('screen_context_violation', {
                    timestamp: new Date().toISOString(),
                    severity: 'critical',
                    baseline: {
                        res: `${baselineRef.current.width}x${baselineRef.current.height}`,
                        label: baselineRef.current.label,
                        surface: baselineRef.current.displaySurface
                    },
                    current: {
                        res: `${curWidth}x${curHeight}`,
                        label: currentTrack.label,
                        surface: currentSettings.displaySurface
                    },
                    reason: isLabelChanged ? 'Source Changed (Label Mismatch)' :
                        isSurfaceChanged ? 'Source Type Changed' : 'Resolution Mismatch > 5%'
                });
            }

            // Track Muted/Ended unexpectedly
            if (currentTrack.muted || currentTrack.readyState === 'ended') {
                log('screen_context_violation', {
                    timestamp: new Date().toISOString(),
                    severity: 'critical',
                    reason: currentTrack.muted ? 'Screen Track Muted' : 'Screen Track Ended Unexpectedly'
                });
            }

        }, 2000); // Check every 2s

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isSharing, mediaStream, log]);

    return {
        violationCount
    };
};
