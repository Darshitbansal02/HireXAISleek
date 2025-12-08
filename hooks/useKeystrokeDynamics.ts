import { useEffect, useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * useKeystrokeDynamics
 * - Analyzes typing patterns (speed, rhythm, pauses)
 * - Detects anomalies suggesting someone else is typing or copy-paste behavior
 * - Establishes a baseline in first 30 seconds, then monitors for deviations
 */

interface KeystrokeMetrics {
    avgIntervalMs: number;
    stdDevMs: number;
    wpm: number;
    burstCount: number;  // Rapid sequences (< 50ms between keys)
    pauseCount: number;  // Long pauses (> 2000ms)
}

interface UseKeystrokeDynamicsOptions {
    assignmentId: string;
    isActive: boolean;
    onAnomaly?: (reason: string, metrics: KeystrokeMetrics) => void;
}

export const useKeystrokeDynamics = ({
    assignmentId,
    isActive,
    onAnomaly
}: UseKeystrokeDynamicsOptions) => {
    const intervalsRef = useRef<number[]>([]);
    const lastKeyTimeRef = useRef<number>(0);
    const charCountRef = useRef(0);
    const startTimeRef = useRef<number>(0);
    const baselineRef = useRef<KeystrokeMetrics | null>(null);
    const [hasBaseline, setHasBaseline] = useState(false);
    const anomalyCountRef = useRef(0);
    const lastAnomalyReportRef = useRef<number>(0);

    const calculateMetrics = useCallback((): KeystrokeMetrics => {
        const intervals = intervalsRef.current;
        if (intervals.length < 5) {
            return { avgIntervalMs: 0, stdDevMs: 0, wpm: 0, burstCount: 0, pauseCount: 0 };
        }

        // Filter out extreme outliers (> 5000ms pauses)
        const filtered = intervals.filter(i => i < 5000);
        if (filtered.length < 5) {
            return { avgIntervalMs: 0, stdDevMs: 0, wpm: 0, burstCount: 0, pauseCount: 0 };
        }

        // Calculate average
        const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;

        // Calculate standard deviation
        const squaredDiffs = filtered.map(i => Math.pow(i - avg, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
        const stdDev = Math.sqrt(avgSquaredDiff);

        // Calculate WPM (assuming 5 chars per word)
        const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
        const wpm = elapsedMinutes > 0 ? (charCountRef.current / 5) / elapsedMinutes : 0;

        // Count bursts (rapid typing < 50ms) and pauses (> 2000ms)
        const burstCount = intervals.filter(i => i < 50).length;
        const pauseCount = intervals.filter(i => i > 2000).length;

        return {
            avgIntervalMs: Math.round(avg),
            stdDevMs: Math.round(stdDev),
            wpm: Math.round(wpm),
            burstCount,
            pauseCount
        };
    }, []);

    const logAnomaly = useCallback(async (reason: string, metrics: KeystrokeMetrics) => {
        const now = Date.now();
        // Rate limit: one report per 30 seconds
        if (now - lastAnomalyReportRef.current < 30000) return;
        lastAnomalyReportRef.current = now;
        anomalyCountRef.current += 1;

        console.warn(`🚨 KEYSTROKE DYNAMICS: ${reason}`);

        try {
            await apiClient.logProctorEvent(assignmentId, 'keystroke_anomaly', {
                timestamp: new Date().toISOString(),
                severity: anomalyCountRef.current > 3 ? 'high' : 'medium',
                reason,
                metrics,
                baseline: baselineRef.current,
                anomalyCount: anomalyCountRef.current,
                message: `Typing pattern anomaly: ${reason}`
            });

            onAnomaly?.(reason, metrics);
        } catch (e) {
            console.error('Failed to log keystroke anomaly:', e);
        }
    }, [assignmentId, onAnomaly]);

    const checkForAnomalies = useCallback(() => {
        if (!baselineRef.current || intervalsRef.current.length < 20) return;

        const current = calculateMetrics();
        const baseline = baselineRef.current;

        // Anomaly 1: Sudden speed increase (> 50% faster than baseline)
        if (current.avgIntervalMs < baseline.avgIntervalMs * 0.5 && current.avgIntervalMs > 0) {
            logAnomaly('Typing speed suddenly increased (possible paste or different typist)', current);
            return;
        }

        // Anomaly 2: Sudden speed decrease (> 100% slower than baseline)
        if (current.avgIntervalMs > baseline.avgIntervalMs * 2) {
            logAnomaly('Typing speed suddenly decreased (possible hesitation or lookup)', current);
            return;
        }

        // Anomaly 3: Unusual burst pattern (many rapid keystrokes in a row)
        if (current.burstCount > baseline.burstCount * 3 && current.burstCount > 10) {
            logAnomaly('Abnormal burst typing detected (possible automated input)', current);
            return;
        }

        // Anomaly 4: High WPM (> 120 WPM is very unusual for coding)
        if (current.wpm > 120 && baseline.wpm < 80) {
            logAnomaly(`Unusually high typing speed: ${current.wpm} WPM`, current);
            return;
        }

        // Anomaly 5: Rhythm consistency changed significantly
        if (Math.abs(current.stdDevMs - baseline.stdDevMs) > baseline.stdDevMs * 1.5) {
            logAnomaly('Typing rhythm pattern changed significantly', current);
            return;
        }
    }, [calculateMetrics, logAnomaly]);

    useEffect(() => {
        if (!isActive || !assignmentId) return;

        startTimeRef.current = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only track alphanumeric and common coding keys
            if (e.key.length !== 1 && !['Backspace', 'Enter', 'Tab', 'Space'].includes(e.key)) {
                return;
            }

            const now = Date.now();
            charCountRef.current += 1;

            if (lastKeyTimeRef.current > 0) {
                const interval = now - lastKeyTimeRef.current;
                intervalsRef.current.push(interval);

                // Keep only last 100 intervals
                if (intervalsRef.current.length > 100) {
                    intervalsRef.current.shift();
                }
            }

            lastKeyTimeRef.current = now;

            // Establish baseline after 30 seconds of typing
            const elapsed = now - startTimeRef.current;
            if (!hasBaseline && elapsed > 30000 && intervalsRef.current.length > 20) {
                baselineRef.current = calculateMetrics();
                setHasBaseline(true);
                console.log('📊 KEYSTROKE DYNAMICS: Baseline established', baselineRef.current);

                // Log baseline to backend
                apiClient.logProctorEvent(assignmentId, 'keystroke_baseline_established', {
                    timestamp: new Date().toISOString(),
                    severity: 'low',
                    baseline: baselineRef.current
                }).catch(console.error);
            }

            // Check for anomalies every 10 keystrokes after baseline
            if (hasBaseline && charCountRef.current % 10 === 0) {
                checkForAnomalies();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive, assignmentId, hasBaseline, calculateMetrics, checkForAnomalies]);

    return {
        hasBaseline,
        currentMetrics: calculateMetrics(),
        anomalyCount: anomalyCountRef.current
    };
};

export default useKeystrokeDynamics;
