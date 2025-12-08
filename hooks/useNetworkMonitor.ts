import { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * useNetworkMonitor
 * - Intercepts fetch/XHR requests to detect calls to known AI APIs
 * - Logs suspicious network activity to backend
 * - Does NOT block requests, only monitors and reports
 */

// Known AI/Cheating domains to monitor
const SUSPICIOUS_DOMAINS = [
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'api.cohere.ai',
    'api.together.xyz',
    'api.replicate.com',
    'api.huggingface.co',
    'chatgpt.com',
    'chat.openai.com',
    'claude.ai',
    'bard.google.com',
    'gemini.google.com',
    'copilot.microsoft.com',
    'bing.com/chat',
    'perplexity.ai',
    'you.com',
    'phind.com',
    'codeium.com',
    'tabnine.com',
    'kite.com',
    'sourcegraph.com'
];

interface UseNetworkMonitorOptions {
    assignmentId: string;
    isActive: boolean;
    onViolation?: (domain: string) => void;
}

export const useNetworkMonitor = ({ assignmentId, isActive, onViolation }: UseNetworkMonitorOptions) => {
    const detectedDomainsRef = useRef<Set<string>>(new Set());
    const originalFetchRef = useRef<typeof fetch | null>(null);
    const originalXHROpenRef = useRef<typeof XMLHttpRequest.prototype.open | null>(null);

    const logDetection = useCallback(async (domain: string, url: string) => {
        // Deduplicate: Only log each domain once per session
        if (detectedDomainsRef.current.has(domain)) return;
        detectedDomainsRef.current.add(domain);

        console.warn(`🚨 NETWORK MONITOR: Detected request to suspicious domain: ${domain}`);

        try {
            await apiClient.logProctorEvent(assignmentId, 'ai_api_detected', {
                timestamp: new Date().toISOString(),
                severity: 'critical',
                domain,
                url: url.substring(0, 200), // Truncate for safety
                message: `Detected network request to AI service: ${domain}`
            });

            onViolation?.(domain);
        } catch (e) {
            console.error('Failed to log network detection:', e);
        }
    }, [assignmentId, onViolation]);

    const checkUrl = useCallback((url: string) => {
        if (!isActive) return;

        try {
            const urlObj = new URL(url, window.location.origin);
            const hostname = urlObj.hostname.toLowerCase();

            for (const suspiciousDomain of SUSPICIOUS_DOMAINS) {
                if (hostname.includes(suspiciousDomain) || hostname.endsWith(suspiciousDomain)) {
                    logDetection(suspiciousDomain, url);
                    return;
                }
            }
        } catch (e) {
            // Invalid URL, ignore
        }
    }, [isActive, logDetection]);

    useEffect(() => {
        if (!isActive || !assignmentId) return;

        // Store originals
        originalFetchRef.current = window.fetch;
        originalXHROpenRef.current = XMLHttpRequest.prototype.open;

        // Intercept fetch
        const originalFetch = window.fetch;
        window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            checkUrl(url);
            return originalFetch.apply(this, [input, init] as any);
        };

        // Intercept XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
            const urlStr = typeof url === 'string' ? url : url.href;
            checkUrl(urlStr);
            return originalOpen.apply(this, [method, url, ...args] as any);
        };

        // Cleanup
        return () => {
            if (originalFetchRef.current) {
                window.fetch = originalFetchRef.current;
            }
            if (originalXHROpenRef.current) {
                XMLHttpRequest.prototype.open = originalXHROpenRef.current;
            }
        };
    }, [isActive, assignmentId, checkUrl]);

    return {
        detectedDomains: Array.from(detectedDomainsRef.current)
    };
};

export default useNetworkMonitor;
