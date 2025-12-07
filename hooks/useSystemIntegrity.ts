import { useEffect, useCallback, useState } from 'react';
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

    // 3. Viewport/DevTools Sanity Log
    useEffect(() => {
        // Run always to detect state, but only fire callback if isActive
        const checkIntegrity = setInterval(() => {
            const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
            const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
            const isSignificantlySmaller = window.innerWidth < (window.screen.availWidth * 0.90);

            // Check for docked DevTools
            const isDocked = (widthDiff > 160 || heightDiff > 160) && isSignificantlySmaller;

            setIsCompromised(isDocked);

            if (isActive && isDocked) {
                onViolation && onViolation('viewport_compromised', 'Screen space reduced significantly. Close any side panels (DevTools) or Maximize the window.');
            }
        }, 1000); // Check every 1s for faster feedback

        return () => clearInterval(checkIntegrity);
    }, [isActive, onViolation]);

    return { isCompromised };
};
