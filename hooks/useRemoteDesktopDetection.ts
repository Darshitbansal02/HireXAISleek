import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * useRemoteDesktopDetection
 * - Detects indicators of remote desktop / screen sharing software
 * - Monitors for unusual mouse movement patterns (latency, teleportation)
 * - Checks frame rate anomalies suggesting RDP compression
 * - Analyzes keyboard input latency patterns
 */

interface RDPIndicator {
    type: 'mouse_teleport' | 'frame_drop' | 'input_latency' | 'cursor_anomaly';
    value: number;
    threshold: number;
    message: string;
}

interface UseRemoteDesktopDetectionOptions {
    assignmentId: string;
    isActive: boolean;
    onRDPDetected?: (indicators: RDPIndicator[]) => void;
}

export const useRemoteDesktopDetection = ({
    assignmentId,
    isActive,
    onRDPDetected
}: UseRemoteDesktopDetectionOptions) => {
    const [isRDPDetected, setIsRDPDetected] = useState(false);
    const [indicators, setIndicators] = useState<RDPIndicator[]>([]);
    const hasReportedRef = useRef(false);

    // Mouse tracking refs
    const lastMousePosRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const mouseTeleportsRef = useRef<number[]>([]);
    const mouseVelocitiesRef = useRef<number[]>([]);

    // Frame timing refs
    const frameTimesRef = useRef<number[]>([]);
    const lastFrameTimeRef = useRef<number>(0);

    // Input latency refs
    const keyTimingsRef = useRef<number[]>([]);

    const logDetection = useCallback(async (detectedIndicators: RDPIndicator[]) => {
        if (!assignmentId || hasReportedRef.current) return;
        hasReportedRef.current = true;

        try {
            await apiClient.logProctorEvent(assignmentId, 'remote_desktop_detected', {
                timestamp: new Date().toISOString(),
                severity: 'critical',
                indicators: detectedIndicators,
                message: 'Remote desktop / screen sharing indicators detected'
            });

            onRDPDetected?.(detectedIndicators);
        } catch (e) {
            console.error('Failed to log RDP detection:', e);
        }
    }, [assignmentId, onRDPDetected]);

    // Mouse movement analysis
    useEffect(() => {
        if (!isActive) return;

        const handleMouseMove = (e: MouseEvent) => {
            const now = performance.now();
            const current = { x: e.clientX, y: e.clientY, time: now };

            if (lastMousePosRef.current) {
                const dt = now - lastMousePosRef.current.time;
                const dx = Math.abs(current.x - lastMousePosRef.current.x);
                const dy = Math.abs(current.y - lastMousePosRef.current.y);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check for teleportation (large instant movement with small time delta)
                // RDP can cause cursor to "jump" due to network latency
                if (dt < 20 && distance > 200) {
                    mouseTeleportsRef.current.push(distance);
                    // Keep last 20
                    if (mouseTeleportsRef.current.length > 20) {
                        mouseTeleportsRef.current.shift();
                    }
                }

                // Track velocity for pattern analysis
                if (dt > 0) {
                    const velocity = distance / dt;
                    mouseVelocitiesRef.current.push(velocity);
                    if (mouseVelocitiesRef.current.length > 50) {
                        mouseVelocitiesRef.current.shift();
                    }
                }
            }

            lastMousePosRef.current = current;
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isActive]);

    // Frame rate analysis using requestAnimationFrame
    useEffect(() => {
        if (!isActive) return;

        let animationId: number;

        const measureFrame = (timestamp: number) => {
            if (lastFrameTimeRef.current > 0) {
                const frameDelta = timestamp - lastFrameTimeRef.current;
                frameTimesRef.current.push(frameDelta);

                // Keep last 60 frames
                if (frameTimesRef.current.length > 60) {
                    frameTimesRef.current.shift();
                }
            }
            lastFrameTimeRef.current = timestamp;
            animationId = requestAnimationFrame(measureFrame);
        };

        animationId = requestAnimationFrame(measureFrame);

        return () => cancelAnimationFrame(animationId);
    }, [isActive]);

    // Keyboard latency analysis
    useEffect(() => {
        if (!isActive) return;

        let keyDownTime = 0;

        const handleKeyDown = () => {
            keyDownTime = performance.now();
        };

        const handleKeyUp = () => {
            if (keyDownTime > 0) {
                const holdTime = performance.now() - keyDownTime;
                keyTimingsRef.current.push(holdTime);
                if (keyTimingsRef.current.length > 30) {
                    keyTimingsRef.current.shift();
                }
                keyDownTime = 0;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [isActive]);

    // Periodic analysis
    useEffect(() => {
        if (!isActive || !assignmentId) return;

        const analyzePatterns = () => {
            const detectedIndicators: RDPIndicator[] = [];

            // 1. Mouse teleportation check
            const teleports = mouseTeleportsRef.current;
            if (teleports.length >= 5) {
                const avgTeleport = teleports.reduce((a, b) => a + b, 0) / teleports.length;
                if (avgTeleport > 150) {
                    detectedIndicators.push({
                        type: 'mouse_teleport',
                        value: avgTeleport,
                        threshold: 150,
                        message: `Frequent cursor teleportation detected (avg: ${avgTeleport.toFixed(0)}px)`
                    });
                }
            }

            // 2. Frame drop check
            const frameTimes = frameTimesRef.current;
            if (frameTimes.length >= 30) {
                const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
                const expectedFrameTime = 1000 / 60; // 60 FPS
                const variance = frameTimes.reduce((sum, t) => sum + Math.pow(t - avgFrameTime, 2), 0) / frameTimes.length;
                const stdDev = Math.sqrt(variance);

                // High variance in frame times suggests RDP compression artifacts
                if (stdDev > 15 && avgFrameTime > 25) {
                    detectedIndicators.push({
                        type: 'frame_drop',
                        value: stdDev,
                        threshold: 15,
                        message: `Frame timing variance detected (stdDev: ${stdDev.toFixed(1)}ms)`
                    });
                }
            }

            // 3. Input latency check
            const keyTimings = keyTimingsRef.current;
            if (keyTimings.length >= 10) {
                const avgKeyHold = keyTimings.reduce((a, b) => a + b, 0) / keyTimings.length;
                // Very consistent key hold times (< 10ms variance) suggest synthetic input
                const keyVariance = keyTimings.reduce((sum, t) => sum + Math.pow(t - avgKeyHold, 2), 0) / keyTimings.length;

                if (keyVariance < 10 && avgKeyHold > 50) {
                    detectedIndicators.push({
                        type: 'input_latency',
                        value: keyVariance,
                        threshold: 10,
                        message: `Suspicious keyboard input pattern detected`
                    });
                }
            }

            // Update state if indicators found
            if (detectedIndicators.length >= 2) {
                setIndicators(detectedIndicators);
                setIsRDPDetected(true);
                console.warn('🖥️ REMOTE DESKTOP DETECTION:', detectedIndicators);
                logDetection(detectedIndicators);
            }
        };

        // Run analysis every 10 seconds
        const interval = setInterval(analyzePatterns, 10000);

        return () => clearInterval(interval);
    }, [isActive, assignmentId, logDetection]);

    return {
        isRDPDetected,
        indicators,
        reset: () => {
            hasReportedRef.current = false;
            mouseTeleportsRef.current = [];
            mouseVelocitiesRef.current = [];
            frameTimesRef.current = [];
            keyTimingsRef.current = [];
            setIsRDPDetected(false);
            setIndicators([]);
        }
    };
};

export default useRemoteDesktopDetection;
