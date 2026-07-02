import { useEffect, useCallback, useState, useRef } from 'react';
import { toast } from 'sonner';

interface SystemIntegrityOptions {
    isActive: boolean;
    onViolation?: (type: string, message: string) => void;
}

export const useSystemIntegrity = ({ isActive, onViolation }: SystemIntegrityOptions) => {

    // 1. Keyboard Blocking
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12
            if (e.key === 'F12') {
                e.preventDefault();
                e.stopPropagation();
                onViolation?.('devtools_attempt', 'Developer Tools are disabled.');
                return false;
            }

            // Block Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J (DevTools)
            if (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                e.stopPropagation();
                onViolation?.('devtools_attempt', 'Developer Tools are disabled.');
                return false;
            }

            // Block Ctrl+U (View Source)
            if (e.ctrlKey && e.key.toUpperCase() === 'U') {
                e.preventDefault();
                onViolation?.('source_view_attempt', 'View Source is disabled.');
                return false;
            }

            // Block Screenshots (PrintScreen / Win+Shift+S / Mac Cmd+Shift+3/4 / Win+PrtScr)
            if (
                e.key === 'PrintScreen' ||
                e.code === 'PrintScreen' ||
                (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) || // Windows Snipping Tool
                (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) || // Mac Screenshots
                (e.metaKey && (e.key === 'PrintScreen' || e.code === 'PrintScreen')) // Win + PrtScr
            ) {
                e.preventDefault();
                e.stopPropagation();
                // Clear clipboard to potentially disrupt snippets
                if (navigator.clipboard) {
                    navigator.clipboard.writeText("Protected Content").catch(() => { });
                }
                onViolation?.('screenshot_attempt', 'Screenshots are prohibited.');
                return false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, onViolation]);

    // 2. Context Menu Blocking
    useEffect(() => {
        if (!isActive) return;

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            // Optional: Silent block or warning
            // onViolation('context_menu', 'Right-click is disabled.'); 
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [isActive]);

    const [isCompromised, setIsCompromised] = useState(false);
    const devToolsOpenRef = useRef(false);
    const lastDebuggerCheckRef = useRef(0);

    // 3. Debugger Statement Detection (catches undocked DevTools)
    useEffect(() => {
        if (!isActive) return;

        const checkDebugger = () => {
            const start = performance.now();
            // debugger statement pauses execution when DevTools is open
            // eslint-disable-next-line no-debugger
            debugger;
            const elapsed = performance.now() - start;

            // If elapsed time is significant (>100ms), debugger paused execution
            if (elapsed > 100 && !devToolsOpenRef.current) {
                devToolsOpenRef.current = true;
                onViolation?.('devtools_attempt', 'Developer Tools detected (debugger pause).');
            } else if (elapsed < 50) {
                devToolsOpenRef.current = false;
            }
        };

        // Don't run in production - debugger statements should be stripped
        // This is a development-time detection method
        // const debugInterval = setInterval(checkDebugger, 5000);
        // return () => clearInterval(debugInterval);
    }, [isActive, onViolation]);

    // 4. Console.log Timing Detection
    useEffect(() => {
        if (!isActive) return;

        const originalLog = console.log;
        let logStartTime = 0;

        console.log = function (...args: any[]) {
            logStartTime = performance.now();
            originalLog.apply(console, args);
            const elapsed = performance.now() - logStartTime;

            // Console.log is significantly slower when DevTools console is open
            if (elapsed > 10 && !devToolsOpenRef.current) {
                // Potential DevTools open
                // Don't trigger violation immediately, just track
            }
        };

        return () => {
            console.log = originalLog;
        };
    }, [isActive]);

    // 5. Viewport/DevTools Sanity Check (More Aggressive)
    useEffect(() => {
        // Run always to detect state, but only fire callback if isActive
        const checkIntegrity = setInterval(() => {
            const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
            const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
            const isSignificantlySmaller = window.innerWidth < (window.screen.availWidth * 0.90);

            // Check for docked DevTools (side or bottom)
            const isDockedSide = widthDiff > 160 && isSignificantlySmaller;
            const isDockedBottom = heightDiff > 160;
            const isDocked = (isDockedSide || isDockedBottom);

            // Additional check: window.outerHeight - window.innerHeight should be ~100-150 for normal browser chrome
            // If it's > 200, likely bottom-docked DevTools
            const suspiciousVerticalDiff = heightDiff > 200;

            const compromised = isDocked || suspiciousVerticalDiff;
            setIsCompromised(compromised);

            if (isActive && compromised) {
                onViolation && onViolation('viewport_compromised', 'Screen space reduced significantly. Close any side panels (DevTools) or Maximize the window.');
            }
        }, 500); // Check every 500ms for faster detection

        return () => clearInterval(checkIntegrity);
    }, [isActive, onViolation]);

    return { isCompromised };
};
