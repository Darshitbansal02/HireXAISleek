import { useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

interface ExtensionDetectorOptions {
    assignmentId: string;
    isActive: boolean;
}

export const useExtensionDetector = ({ assignmentId, isActive }: ExtensionDetectorOptions) => {
    const violationCountRef = useRef(0);
    const observerRef = useRef<MutationObserver | null>(null);

    const logDetection = useCallback((reason: string, metadata: Record<string, unknown> = {}) => {
        if (!isActive) return;
        violationCountRef.current += 1;
        apiClient.logProctorEvent(assignmentId, 'extension_detected', {
            timestamp: new Date().toISOString(),
            reason,
            severity: 'high',
            ...metadata
        }).then(res => {
            if (res && res.terminated) {
                // If backend says terminate, force a reload or callback if we had one
                // ideally passed in options. But for now, we rely on the main ProctoringGuard 
                // to handle the state. However, pure hook needs a way to signal back.
                // Note: ProctoringGuard also handles this via polling or state. 
                // But strict enforcement:
                window.location.reload(); // Simplest way to force state sync if hook is isolated
            }
        }).catch(console.error);
    }, [assignmentId, isActive]);

    useEffect(() => {
        if (!isActive) {
            if (observerRef.current) observerRef.current.disconnect();
            return;
        }

        // 1. DOM Injection Detection (MutationObserver)
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement) {
                            // Check 1: Shadow Roots (often used by extensions to hide UI)
                            if (node.shadowRoot) {
                                logDetection('Shadow Root Injection', { tagName: node.tagName });
                            }

                            // Check 2: High Z-Index Overlays
                            const style = window.getComputedStyle(node);
                            const zIndex = parseInt(style.zIndex, 10);
                            if (!isNaN(zIndex) && zIndex > 9999 && node.id !== 'security-overlay-root') {
                                // Heuristic: Ignore our own security overlay
                                // Check if it looks like a sidebar or floating panel
                                if (node.tagName === 'IFRAME' || (node.offsetWidth < 400 && node.offsetHeight > 300)) {
                                    logDetection('Suspicious High Z-Index Element', {
                                        tagName: node.tagName,
                                        zIndex,
                                        dims: `${node.offsetWidth}x${node.offsetHeight}`
                                    });
                                }
                            }

                            // Check 3: Specific Known Extension Classes/IDs (Generic Heuristics)
                            const id = node.id?.toLowerCase() || '';
                            const className = node.className?.toString().toLowerCase() || '';

                            if (
                                id.includes('sidebar') ||
                                id.includes('gpt') ||
                                id.includes('copilot') ||
                                className.includes('sidebar-content')
                            ) {
                                logDetection('Suspicious Extension UI Detected', { id, className });
                            }
                        }
                    });
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        observerRef.current = observer;

        // 2. Periodic Runtime Check (Best Effort)
        const checkRuntime = setInterval(() => {
            try {
                // Some extensions inject chrome.runtime into the main world incorrectly
                // @ts-ignore
                if (window.chrome && window.chrome.runtime && window.chrome.runtime.id) {
                    // This is rare for content scripts but possible if poorly isolated
                    logDetection('Chrome Runtime Leaked', {});
                }
            } catch (e) {
                // Ignore runtime access errors
            }
        }, 5000);

        return () => {
            observer.disconnect();
            clearInterval(checkRuntime);
        };

    }, [isActive, logDetection]);

    return {};
};
