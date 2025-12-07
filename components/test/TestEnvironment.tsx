import React, { useEffect, useState } from 'react';

import { AlertTriangle, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TestEnvironmentProps {
    attemptId: number;
    children: React.ReactNode;
    onViolation: (type: string) => void;
}

export function TestEnvironment({ attemptId, children, onViolation }: TestEnvironmentProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [warnings, setWarnings] = useState(0);

    // Enforce Fullscreen
    const enterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch (err) {
            console.error("Fullscreen denied:", err);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) {
                setWarnings(w => w + 1);
                onViolation("fullscreen_exit");
                toast.error("WARNING: You must remain in fullscreen mode!");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setWarnings(w => w + 1);
                onViolation("tab_switch");
                toast.error("WARNING: Tab switching is monitored!");
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [onViolation]);

    if (!isFullscreen) {
        return (
            <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Secure Test Environment</h1>
                <p className="text-muted-foreground mb-6 max-w-md">
                    This test requires fullscreen mode. Exiting fullscreen or switching tabs will be recorded as a violation.
                </p>
                <Button onClick={enterFullscreen} size="lg" className="gap-2">
                    <Maximize className="h-4 w-4" />
                    Enter Fullscreen to Start
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background select-none">
            {children}
            {/* Snapshot proctoring removed in favor of metadata-only proctoring */}

            {warnings > 0 && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-destructive/90 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse z-50">
                    Warnings: {warnings}
                </div>
            )}
        </div>
    );
}
