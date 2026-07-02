import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * useMultiMonitorDetection
 * - Detects if the user has multiple monitors connected
 * - Uses Screen Details API (Chrome 100+) when available
 * - Falls back to screen dimension analysis
 * - Logs warning/violation to backend
 */

interface MonitorInfo {
    count: number;
    primary: {
        width: number;
        height: number;
    };
    isExtended: boolean;
}

interface UseMultiMonitorDetectionOptions {
    assignmentId: string;
    isActive: boolean;
    blockOnMultiMonitor?: boolean; // If true, prevents test start
    onMultiMonitorDetected?: (info: MonitorInfo) => void;
}

export const useMultiMonitorDetection = ({
    assignmentId,
    isActive,
    blockOnMultiMonitor = false,
    onMultiMonitorDetected
}: UseMultiMonitorDetectionOptions) => {
    const [monitorInfo, setMonitorInfo] = useState<MonitorInfo | null>(null);
    const [isMultiMonitor, setIsMultiMonitor] = useState(false);
    const hasReportedRef = useRef(false);

    const checkScreenDetailsAPI = useCallback(async (): Promise<MonitorInfo | null> => {
        // Screen Details API - Modern Chrome/Edge
        // @ts-ignore - getScreenDetails is experimental
        if (typeof window.getScreenDetails === 'function') {
            try {
                // Request permission for screen details
                // @ts-ignore
                const screenDetails = await window.getScreenDetails();
                const screens = screenDetails.screens || [];

                const info: MonitorInfo = {
                    count: screens.length,
                    primary: {
                        width: screenDetails.currentScreen?.width || window.screen.width,
                        height: screenDetails.currentScreen?.height || window.screen.height
                    },
                    isExtended: screens.length > 1
                };

                return info;
            } catch (e) {
                console.warn('Screen Details API failed or denied:', e);
            }
        }
        return null;
    }, []);

    const checkScreenIsExtended = useCallback((): MonitorInfo => {
        // Fallback: window.screen.isExtended (Chrome 100+)
        // @ts-ignore
        const isExtended = window.screen.isExtended === true;

        // Heuristic: If availWidth is much larger than screen width, might indicate multi-monitor
        const widthRatio = window.screen.availWidth / window.screen.width;
        const heightRatio = window.screen.availHeight / window.screen.height;

        // Another heuristic: devicePixelRatio inconsistencies
        // (different monitors may have different DPIs)

        return {
            count: isExtended ? 2 : 1, // Can only detect "more than 1" without API
            primary: {
                width: window.screen.width,
                height: window.screen.height
            },
            isExtended
        };
    }, []);

    const checkWindowPlacement = useCallback((): boolean => {
        // If window is positioned outside the primary screen bounds
        // it indicates multi-monitor setup
        const { screenX, screenY, outerWidth, outerHeight } = window;
        const { width: screenWidth, height: screenHeight } = window.screen;

        // Window extends beyond screen boundaries?
        const extendsRight = (screenX + outerWidth) > screenWidth + 50; // 50px buffer
        const extendsLeft = screenX < -50;

        return extendsRight || extendsLeft;
    }, []);

    const runDetection = useCallback(async () => {
        // Try Screen Details API first (most accurate)
        let info = await checkScreenDetailsAPI();

        // Fallback to isExtended check
        if (!info) {
            info = checkScreenIsExtended();
        }

        // Additional heuristic: window placement
        const isOutsideBounds = checkWindowPlacement();
        if (isOutsideBounds && !info.isExtended) {
            info = {
                ...info,
                isExtended: true,
                count: Math.max(info.count, 2)
            };
        }

        setMonitorInfo(info);
        setIsMultiMonitor(info.isExtended);

        return info;
    }, [checkScreenDetailsAPI, checkScreenIsExtended, checkWindowPlacement]);

    const logDetection = useCallback(async (info: MonitorInfo) => {
        if (!assignmentId || hasReportedRef.current) return;
        hasReportedRef.current = true;

        try {
            await apiClient.logProctorEvent(assignmentId, 'multi_monitor_detected', {
                timestamp: new Date().toISOString(),
                severity: blockOnMultiMonitor ? 'critical' : 'high',
                monitorCount: info.count,
                isExtended: info.isExtended,
                primaryResolution: `${info.primary.width}x${info.primary.height}`,
                message: `Multiple monitors detected (${info.count} screens)`
            });

            onMultiMonitorDetected?.(info);
        } catch (e) {
            console.error('Failed to log multi-monitor detection:', e);
        }
    }, [assignmentId, blockOnMultiMonitor, onMultiMonitorDetected]);

    // Initial detection
    useEffect(() => {
        if (!isActive || !assignmentId) return;

        const detect = async () => {
            const info = await runDetection();
            if (info.isExtended) {
                console.warn('🖥️ MULTI-MONITOR: Extended display detected', info);
                await logDetection(info);
            }
        };

        detect();

        // Also listen for screen changes (monitor connected/disconnected)
        // @ts-ignore
        if (window.screen.addEventListener) {
            const handleChange = async () => {
                hasReportedRef.current = false; // Allow re-report on change
                await detect();
            };
            // @ts-ignore
            window.screen.addEventListener('change', handleChange);
            return () => {
                // @ts-ignore
                window.screen.removeEventListener('change', handleChange);
            };
        }
    }, [isActive, assignmentId, runDetection, logDetection]);

    // Continuous monitoring for window movement
    useEffect(() => {
        if (!isActive || !isMultiMonitor) return;

        const checkInterval = setInterval(() => {
            const isOutside = checkWindowPlacement();
            if (isOutside && !hasReportedRef.current) {
                // Window moved to another monitor
                apiClient.logProctorEvent(assignmentId, 'multi_monitor_detected', {
                    timestamp: new Date().toISOString(),
                    severity: 'high',
                    reason: 'Window moved outside primary screen bounds',
                    message: 'Window moved to secondary monitor'
                }).catch(console.error);
                hasReportedRef.current = true;
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(checkInterval);
    }, [isActive, assignmentId, isMultiMonitor, checkWindowPlacement]);

    return {
        monitorInfo,
        isMultiMonitor,
        shouldBlock: isMultiMonitor && blockOnMultiMonitor,
        recheck: runDetection
    };
};

export default useMultiMonitorDetection;
