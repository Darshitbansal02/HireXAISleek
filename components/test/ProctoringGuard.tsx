"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import screenfull from 'screenfull';
import { apiClient } from '@/lib/api-client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { AlertTriangle, Camera, Maximize, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import useScreenShareProctor from '@/hooks/useScreenShareProctor';
import useSingleTabEnforcer from '@/hooks/useSingleTabEnforcer';
import { useSystemIntegrity } from '@/hooks/useSystemIntegrity';
import { useExtensionDetector } from '@/hooks/useExtensionDetector';

interface ProctoringGuardProps {
    assignmentId: string;
    onViolation: (type: string) => void;
    children: React.ReactNode;
    maxWarnings?: number;
    onTerminate?: () => void;
}

const ProctoringGuard: React.FC<ProctoringGuardProps> = ({
    assignmentId,
    onViolation,
    children,
    maxWarnings = 5,
    onTerminate
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Removed local warnings array. Using backend-synced warningCount.
    const webcamRef = useRef<Webcam>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [gracePeriod, setGracePeriod] = useState(true);

    // New State for Screenshot Blocking
    const [isObscured, setIsObscured] = useState(false);
    const [obscureMessage, setObscureMessage] = useState({ title: "Security Violation", subtitle: "Screenshot Attempt Detected" });
    const obscureOverlayRef = useRef<HTMLDivElement>(null);

    // Transient Warning Box State
    const [currentWarning, setCurrentWarning] = useState<string | null>(null);

    // Auto-dismiss warning box
    useEffect(() => {
        if (!currentWarning) return;
        const timer = setTimeout(() => setCurrentWarning(null), 5000);
        return () => clearTimeout(timer);
    }, [currentWarning]);

    // Lockout State
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    // Countdown Timer
    useEffect(() => {
        if (!lockoutUntil) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setLockoutUntil(null);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    const triggerObscure = useCallback((instant = true, title = "Security Violation", subtitle = "Screenshot Attempt Detected", lockoutSteps = 0) => {
        // Direct DOM manipulation for instant feedback
        document.body.classList.add('security-violation');

        if (instant && obscureOverlayRef.current) {
            obscureOverlayRef.current.style.display = 'flex';
        }
        setObscureMessage({ title, subtitle });
        setIsObscured(true);

        // Apply Lockout if requested (e.g. for Screenshots)
        if (lockoutSteps > 0) {
            setLockoutUntil(Date.now() + lockoutSteps);
            setTimeLeft(Math.ceil(lockoutSteps / 1000));
        }
    }, []);

    const releaseObscure = useCallback(() => {
        if (lockoutUntil && Date.now() < lockoutUntil) return; // Enforce Lockout

        setIsObscured(false);
        document.body.classList.remove('security-violation');

        if (obscureOverlayRef.current) {
            obscureOverlayRef.current.style.display = 'none';
        }
    }, [lockoutUntil]);

    // Restored Logic
    const [isSettingUpScreenShare, setIsSettingUpScreenShare] = useState(false);

    // Tracking refs
    const lastBlurTime = useRef<number | null>(null);

    // Grace period
    useEffect(() => {
        const timer = setTimeout(() => setGracePeriod(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // --- Backend Synced State ---
    const [warningCount, setWarningCount] = useState(0);

    // Initial Sync
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const status = await apiClient.getProctorEventsStatus(assignmentId);
                setWarningCount(status.warning_count);
                if (status.terminated) {
                    onTerminate && onTerminate();
                }
            } catch (e) {
                console.error("Failed to sync proctor status", e);
            }
        };
        fetchStatus();
    }, [assignmentId, onTerminate]);


    // --- Violation Handler (Backend Authoritative) ---
    const handleViolation = useCallback(async (type: string, message: string, extraPayload: any = {}) => {
        // Skip logs during grace period (except devtools which are critical)
        if (gracePeriod && type !== 'devtools_attempt') return;

        // Optimistic UI update for immediate feedback (optional, but good UX)
        toast.warning(message, { duration: 3000 });
        setCurrentWarning(message); // Trigger Red Box
        onViolation(type);

        try {
            const response = await apiClient.logProctorEvent(assignmentId, type, {
                message,
                timestamp: new Date().toISOString(),
                ...extraPayload
            });

            // Authoritative Update from Backend
            if (response) {
                setWarningCount(response.warning_count);

                if (response.terminated) {
                    // Immediate Termination Trigger
                    setTimeout(() => onTerminate && onTerminate(), 0);
                }
            }
        } catch (error) {
            console.error("Failed to log violation:", error);
        }
    }, [assignmentId, onViolation, gracePeriod, onTerminate]);

    // Use System Integrity Hook
    const { isCompromised } = useSystemIntegrity({
        isActive: true, // ALWAYS CHECK INTEGRITY, even during setup/grace period
        onViolation: (type, msg) => handleViolation(type, msg)
    });

    // --- Face Detection Hook ---
    useEffect(() => {
        if (webcamRef.current && webcamRef.current.video) {
            // @ts-ignore
            videoRef.current = webcamRef.current.video;
        }
    }, [isCameraReady]);

    useFaceDetection({
        videoRef,
        isActive: isCameraReady && isFullscreen && !gracePeriod,
        onMultipleFaces: (count) => {
            handleViolation("multiple_faces", `Multiple faces detected (${count}).`, { faces_count: count });
        },
        onFaceMissing: (duration) => {
            if (duration > 5) {
                handleViolation("face_missing", "Face not detected. Please stay in front of the camera.", { duration_missing_seconds: duration });
            }
        }
    });

    // --- Screen Share Setup (Step 2) ---
    const { isSharing, start: startScreenProctor, stop: stopScreenProctor } = useScreenShareProctor(assignmentId);

    const handleStartScreenShare = async () => {
        try {
            setIsSettingUpScreenShare(true);
            await startScreenProctor();
            setIsSettingUpScreenShare(false);
            // isSharing will update via hook
        } catch (error) {
            setIsSettingUpScreenShare(false);
            console.error("Failed to start screen share:", error);
            toast.error("Screen sharing is required to proceed.");
        }
    };

    // --- Strict Security Enforcers (Only active when test is fully running) ---
    // --- Strict Security Enforcers (Only active when test is fully running) ---
    useEffect(() => {
        // Only enforce if we have passed all checks
        if (!isFullscreen || !permissionsGranted || !isSharing) return;

        const handleScreenshotAttempt = () => {
            // CRITICAL: Block IMMEDIATELY using Ref for speed
            // ENFORCE 5s LOCKOUT to defeat delayed capture tools (Snipping Tool)
            triggerObscure(true, "Security Violation", "Screenshot Attempt Detected", 5000);

            handleViolation("screenshot_attempt", "Screenshots are prohibited.");

            // Clear clipboard aggressively
            if (navigator.clipboard) {
                const clearClip = () => navigator.clipboard.writeText("Screenshot Prohibited - Violation Logged").catch(() => { });
                clearClip();
                // Extended clearing loop for race conditions
                const clipInterval = setInterval(clearClip, 100);
                setTimeout(() => clearInterval(clipInterval), 2000);
            }

            // PERMANENT BLOCK until Manual Dismiss (with Penalty Time)
        };

        const handleCopyCutPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            handleViolation("clipboard_attempt", "Copying, cutting, and pasting are disabled.");
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Consolidated Screenshot Blocking Logic
            const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen';
            const isSnippingTool = e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S');
            const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4');
            const isWinPrintScreen = e.metaKey && isPrintScreen;

            if (isPrintScreen || isSnippingTool || isMacScreenshot || isWinPrintScreen) {
                e.preventDefault();
                e.stopPropagation();
                handleScreenshotAttempt();
                return;
            }

            // DevTools Check
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
                (e.ctrlKey && e.key === 'U')
            ) {
                e.preventDefault();
                handleViolation("devtools_open", "DevTools usage is prohibited.");
            }
        };

        // KeyUp Listener to clear clipboard recursively if PrintScreen was held
        // Also acts as a fallback if KeyDown was consumed by OS
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText("Protected").catch(() => { });
                }
                // Fallback triggering if logic missed it (e.g. Win+PtrScr race condition)
                handleScreenshotAttempt();
            }
        }

        document.addEventListener('copy', handleCopyCutPaste);
        document.addEventListener('cut', handleCopyCutPaste);
        document.addEventListener('paste', handleCopyCutPaste);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('copy', handleCopyCutPaste);
            document.removeEventListener('cut', handleCopyCutPaste);
            document.removeEventListener('paste', handleCopyCutPaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleViolation, isFullscreen, permissionsGranted, isSharing, triggerObscure, releaseObscure]);

    // --- Tab Switching & Blur ---
    // Valid Ref for tracking visible blur timeout
    const visibleBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Tab Switching & Blur ---
    useEffect(() => {
        if (!isFullscreen || !permissionsGranted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // IMMEDIATE critical violation for Alt-Tab/Minimizing
                // Clear any pending "visible blur" check since we know it's a hide
                if (visibleBlurTimeoutRef.current) {
                    clearTimeout(visibleBlurTimeoutRef.current);
                    visibleBlurTimeoutRef.current = null;
                }

                triggerObscure(true, "Security Violation", "Tab Switching Detected");
                handleViolation("tab_switch", "You switched tabs or minimized the browser.");
                lastBlurTime.current = Date.now();
            } else {
                // Returned to visibility
            }
        };

        const handleBlur = () => {
            // Split Logic: Hidden (Alt-Tab) vs Visible (Clicking Browser UI/Overlay)
            if (document.hidden) {
                // Case A: Hidden -> Immediate Block
                triggerObscure(true, "Focus Lost", "Tab Switching Detected");
                if (!lastBlurTime.current) lastBlurTime.current = Date.now();
            } else {
                // Case B: Visible (e.g., "Stop Sharing" bar, Second Monitor) -> Delayed Check
                // Reduced buffer to 500ms for "Immediate" feel while safe-guarding "Hide" click
                if (!visibleBlurTimeoutRef.current) {
                    visibleBlurTimeoutRef.current = setTimeout(() => {
                        triggerObscure(true, "Focus Lost", "External Application / Interaction Detected");
                        if (!lastBlurTime.current) lastBlurTime.current = Date.now();
                    }, 500); // 0.5 second buffer - Snappy but safe for UI clicks
                }
            }
        };

        const handleFocus = () => {
            // 1. Clear any pending "Visible Blur" violation
            if (visibleBlurTimeoutRef.current) {
                clearTimeout(visibleBlurTimeoutRef.current);
                visibleBlurTimeoutRef.current = null;
            }

            // 2. Handle actual logged blurs
            if (lastBlurTime.current) {
                const duration = (Date.now() - lastBlurTime.current) / 1000;

                // Only log if it was a significant duration or a hidden violation
                // For visible blurs < 0.5s (that didn't trigger the timeout), we effectively IGNORE them.
                if (duration > 0.5) { // Filter micro-blurs
                    if (isSharing) {
                        handleViolation("focus_lost_while_screen_sharing",
                            `Focus lost for ${duration.toFixed(1)}s.`,
                            { duration_away_seconds: duration, severity: 'medium', was_visible: !document.hidden }
                        );
                    } else {
                        handleViolation("focus_lost",
                            `Focus lost for ${duration.toFixed(1)}s`,
                            { duration_seconds: duration, was_hidden: document.hidden }
                        );
                    }
                }

                lastBlurTime.current = null;
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, [handleViolation, isFullscreen, permissionsGranted, isSharing]);

    // --- Fullscreen Enforcement ---
    const enterFullscreen = () => {
        if (screenfull.isEnabled) {
            screenfull.request().catch(err => {
                console.error("Fullscreen error:", err);
                toast.error("Could not enter fullscreen. Please allow fullscreen permissions.");
            });
        }
    };

    useEffect(() => {
        // If we are in setup steps wait for sharing
        if (!isSharing) return;

        const handleFullscreenChange = () => {
            const isFull = screenfull.isFullscreen;
            setIsFullscreen(isFull);

            if (!isFull && permissionsGranted && !gracePeriod) {
                handleViolation("fullscreen_exit", "You exited fullscreen mode.");
            }
        };

        if (screenfull.isEnabled) {
            screenfull.on('change', handleFullscreenChange);
        }

        return () => {
            if (screenfull.isEnabled) {
                screenfull.off('change', handleFullscreenChange);
            }
        };
    }, [permissionsGranted, handleViolation, gracePeriod, isSharing]);

    // --- Single Tab Enforcement ---
    useSingleTabEnforcer(assignmentId, (isActive) => {
        if (!isActive) {
            handleViolation(
                "multiple_test_tabs_detected",
                "Test is already open in another tab. This instance is restricted."
            );
        }
    });

    // --- Extension Detection ---
    useExtensionDetector({
        assignmentId,
        isActive: isFullscreen && !gracePeriod
    });

    // --- Draggable Logic ---
    const [position, setPosition] = useState({ x: window.innerWidth - 150, y: window.innerHeight - 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
        }
    }, [isDragging, dragOffset]);

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove]);

    // --- Permission Check ---
    const checkPermissions = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            stream.getTracks().forEach(track => track.stop());
            setPermissionsGranted(true);
        } catch (err) {
            console.error("Permission denied:", err);
            toast.error("Camera permission is required to start the test.");
            setPermissionsGranted(false);
        }
    }, []);

    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    // --- Render Logic ---

    // 0. CRITICAL: System Integrity Block (DevTools/Viewport) - Covers ALL phases (Camera, Screen, Test)
    if (isCompromised) {
        return (
            <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="w-full max-w-lg shadow-2xl border-destructive/20 bg-destructive/5 rounded-xl border bg-card text-card-foreground">
                    <div className="flex flex-col space-y-1.5 p-6 text-center pb-2">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 rounded-full bg-destructive/10 animate-pulse">
                                <AlertTriangle className="w-12 h-12 text-destructive" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-destructive">
                            Critical Security Warning
                        </h3>
                    </div>
                    <div className="p-6 pt-0 space-y-6 text-center">
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-lg font-medium">
                                System integrity compromised. Developer Tools or invalid viewport detected.
                            </p>
                            <p className="text-destructive font-bold text-lg uppercase tracking-wide">
                                ⚠️ This is your FINAL WARNING ⚠️
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Continuing to access prohibited tools will result in <strong>IMMEDIATE EXAM TERMINATION</strong>.
                            </p>
                        </div>

                        <div className="p-4 bg-background rounded-xl border border-destructive/10 text-left">
                            <p className="font-semibold text-destructive mb-2">Requirement to Proceed:</p>
                            <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                                <li>Close ALL Developer Tools (F12) immediately.</li>
                                <li>Restore browser to full width and height.</li>
                                <li>Do not attempt to inspect code or modify the page.</li>
                            </ul>
                        </div>

                        <Button size="lg" className="w-full bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20" onClick={() => window.location.reload()}>
                            I Acknowledge & Fix
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Camera Permissions
    if (!permissionsGranted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center space-y-4">
                    <div className="flex justify-center mb-4">
                        <Camera className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">System Check: Camera</h2>
                    <p className="text-muted-foreground">
                        Step 1 of 3: We require camera access for proctoring.
                    </p>
                    <Button onClick={checkPermissions} size="lg" className="w-full">
                        Grant Camera Permission
                    </Button>
                </div>
            </div>
        );
    }

    // Step 2: Screen Share
    if (!isSharing) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center space-y-4">
                    <div className="flex justify-center mb-4">
                        <Maximize className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">System Check: Screen Share</h2>
                    <p className="text-muted-foreground">
                        Step 2 of 3: Please share your <strong>Entire Screen</strong>.
                        We cannot see your screen yet. This will open your browser's sharing dialog.
                    </p>
                    <div className="p-4 bg-muted/50 rounded-lg text-sm text-left">
                        <p className="font-semibold mb-2">Instructions:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Click the button below.</li>
                            <li>Select <strong>"Entire Screen"</strong> tab.</li>
                            <li>Click the screen image to select it.</li>
                            <li>Click <strong>"Share"</strong>.</li>
                        </ol>
                    </div>
                    <Button onClick={handleStartScreenShare} size="lg" className="w-full">
                        {isSettingUpScreenShare ? 'Waiting for Screen selection...' : 'Share Entire Screen'}
                    </Button>
                </div>
            </div>
        );
    }

    // Step 3: Fullscreen
    if (!isFullscreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center space-y-4">
                    <div className="flex justify-center mb-4">
                        <Maximize className="w-12 h-12 text-blue-600 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold">System Check: Fullscreen</h2>
                    <p className="text-muted-foreground">
                        Step 3 of 3: Final step. Use fullscreen mode for the test duration.
                    </p>
                    <Button onClick={enterFullscreen} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                        Enter Fullscreen & Start Test
                    </Button>
                </div>
            </div>
        );
    }

    // All Checks Passed - Test Content
    return (
        <div className="relative w-full h-full select-none" onContextMenu={(e) => e.preventDefault()}>
            <style jsx global>{`
                @media print {
                    body { display: none !important; }
                }
            `}</style>

            {/* Watermark */}
            <div className="fixed inset-0 pointer-events-none z-[50] flex items-center justify-center opacity-[0.03] overflow-hidden">
                <div className="rotate-[-45deg] text-xs font-bold whitespace-nowrap select-none">
                    {Array.from({ length: 100 }).map((_, i) => (
                        <span key={i} className="mx-8 my-8 inline-block">
                            CONFIDENTIAL • {assignmentId} • NO SCREENSHOTS
                        </span>
                    ))}
                </div>
            </div>

            {/* Robust Global Security Style */}
            <style jsx global>{`
                body.security-violation > *:not(#security-overlay-root) {
                    filter: blur(20px) grayscale(100%) !important;
                    pointer-events: none !important;
                    user-select: none !important;
                    overflow: hidden !important;
                }
                body.security-violation #security-overlay-root {
                    filter: none !important;
                    z-index: 2147483647 !important; /* Max Z-Index */
                    display: flex !important;
                }
            `}</style>

            {/* Screenshot Block Overlay - Ref Optimized */}
            <div
                id="security-overlay-root"
                ref={obscureOverlayRef}
                className="fixed inset-0 z-[9999] bg-black flex items-center justify-center flex-col gap-4 text-center p-10 select-none"
                style={{ display: isObscured ? 'flex' : 'none' }}
            >
                <AlertTriangle className="w-24 h-24 text-red-600 animate-pulse" />
                <h1 className="text-4xl font-bold uppercase text-red-500 tracking-widest">{obscureMessage.title}</h1>
                <p className="text-2xl text-white font-semibold">{obscureMessage.subtitle}</p>
                <p className="text-gray-400 max-w-lg mb-6">
                    You have attempted to capture protected content or switched context. This action has been logged.
                    Repeated violations will result in test termination.
                </p>
                <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => releaseObscure()}
                    disabled={timeLeft > 0}
                    className="animate-in fade-in zoom-in duration-500 delay-1000 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {timeLeft > 0 ? `Wait ${timeLeft}s to Resume` : 'I Acknowledge & Resume'}
                </Button>
            </div>

            {/* Draggable Webcam */}
            <div
                style={{
                    position: 'fixed',
                    left: position.x,
                    top: position.y,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    display: isObscured ? 'none' : 'block' // Hide webcam if obscured
                }}
                onMouseDown={handleMouseDown}
                className="w-32 h-24 bg-black rounded-lg overflow-hidden border border-gray-800 shadow-lg z-[100] border-white/20"
            >
                <div className="w-full h-full relative bg-black/80 backdrop-blur-sm">
                    {/* Camera */}
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        width={128}
                        height={96}
                        onUserMedia={() => setIsCameraReady(true)}
                        className="w-full h-full object-cover pointer-events-none rounded-lg"
                        videoConstraints={{
                            width: 128,
                            height: 96,
                            facingMode: "user"
                        }}
                    />
                    {/* Status Indicator */}
                    <div className="absolute top-2 right-2 flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                    </div>
                </div>
            </div>




            {/* Transient Warning Box (Standard Style) */}
            {currentWarning && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 pointer-events-none">
                    <Alert variant="destructive" className="mb-2 shadow-lg animate-in fade-in slide-in-from-top-5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Security Violation</AlertTitle>
                        <AlertDescription>
                            {currentWarning}
                        </AlertDescription>
                    </Alert>
                </div>
            )}{children}
        </div >
    );
};

export default ProctoringGuard;