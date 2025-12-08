import { useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * useClipboardMonitor
 * - Detects paste events with content exceeding a threshold
 * - Flags suspiciously large pastes (likely from external sources)
 * - Logs events to backend for proctor review
 */

interface UseClipboardMonitorOptions {
    assignmentId: string;
    isActive: boolean;
    // Characters threshold to trigger a violation (default: 100)
    pasteThreshold?: number;
    onViolation?: (contentLength: number) => void;
}

export const useClipboardMonitor = ({
    assignmentId,
    isActive,
    pasteThreshold = 100,
    onViolation
}: UseClipboardMonitorOptions) => {
    const pasteCountRef = useRef(0);
    const totalPastedCharsRef = useRef(0);
    const lastPasteTimeRef = useRef<number>(0);

    const logPasteEvent = useCallback(async (
        contentLength: number,
        severity: 'low' | 'medium' | 'high' | 'critical',
        reason: string
    ) => {
        try {
            await apiClient.logProctorEvent(assignmentId, 'clipboard_paste_detected', {
                timestamp: new Date().toISOString(),
                severity,
                contentLength,
                pasteCount: pasteCountRef.current,
                totalPastedChars: totalPastedCharsRef.current,
                message: reason
            });

            if (severity === 'high' || severity === 'critical') {
                onViolation?.(contentLength);
            }
        } catch (e) {
            console.error('Failed to log paste event:', e);
        }
    }, [assignmentId, onViolation]);

    useEffect(() => {
        if (!isActive || !assignmentId) return;

        const handlePaste = (e: ClipboardEvent) => {
            const now = Date.now();
            pasteCountRef.current += 1;

            // Get pasted content
            const pastedText = e.clipboardData?.getData('text') || '';
            const contentLength = pastedText.length;
            totalPastedCharsRef.current += contentLength;

            // Determine severity based on content length and frequency
            let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
            let reason = '';

            if (contentLength > 500) {
                // Very large paste (likely copied code block)
                severity = 'critical';
                reason = `Large paste detected: ${contentLength} characters (likely copied from external source)`;
                console.warn(`🚨 CLIPBOARD MONITOR: ${reason}`);
            } else if (contentLength > pasteThreshold) {
                // Medium paste
                severity = 'high';
                reason = `Suspicious paste detected: ${contentLength} characters`;
                console.warn(`⚠️ CLIPBOARD MONITOR: ${reason}`);
            } else if (pasteCountRef.current > 10) {
                // Frequent small pastes
                severity = 'medium';
                reason = `Frequent paste activity: ${pasteCountRef.current} pastes totaling ${totalPastedCharsRef.current} chars`;
            }

            // Rapid paste detection (multiple pastes within 2 seconds)
            if (now - lastPasteTimeRef.current < 2000 && pasteCountRef.current > 3) {
                severity = severity === 'low' ? 'medium' : severity;
                reason = `Rapid paste sequence detected: ${pasteCountRef.current} pastes`;
            }

            lastPasteTimeRef.current = now;

            // Log to backend
            if (contentLength > 50 || pasteCountRef.current > 5) {
                logPasteEvent(contentLength, severity, reason || `Paste event: ${contentLength} chars`);
            }
        };

        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, [isActive, assignmentId, pasteThreshold, logPasteEvent]);

    return {
        pasteCount: pasteCountRef.current,
        totalPastedChars: totalPastedCharsRef.current
    };
};

export default useClipboardMonitor;
