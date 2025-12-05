"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import screenfull from 'screenfull';
import { apiClient } from '@/lib/api-client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Camera, Maximize, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// Define FaceDetector types locally since they are experimental
interface FaceDetectorOptions {
    fastMode?: boolean;
    maxDetectedFaces?: number;
}

interface DetectedFace {
    boundingBox: DOMRectReadOnly;
    landmarks: any[];
}

declare class FaceDetector {
    constructor(options?: FaceDetectorOptions);
    detect(image: ImageBitmapSource): Promise<DetectedFace[]>;
}

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
    const [warnings, setWarnings] = useState<string[]>([]);
    const webcamRef = useRef<Webcam>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [gracePeriod, setGracePeriod] = useState(true);

    // Tracking refs
    const lastBlurTime = useRef<number | null>(null);
    const faceMissingSince = useRef<number | null>(null);
    const faceDetectorRef = useRef<FaceDetector | null>(null);

    // Grace period to prevent initial false positives
    useEffect(() => {
        const timer = setTimeout(() => setGracePeriod(false), 5000); // 5s grace period
        return () => clearTimeout(timer);
    }, []);

    // --- Violation Handler ---
    const handleViolation = useCallback(async (type: string, message: string, extraPayload: any = {}) => {
        if (gracePeriod) return;

        setWarnings(prev => {
            // Don't spam the same warning
            if (prev.includes(message)) return prev;

            const newWarnings = [...prev, message];
            if (onTerminate && newWarnings.length >= maxWarnings) {
                onTerminate();
            }
            return newWarnings;
        });

        // Auto-dismiss toast after 3 seconds
        toast.warning(message, { duration: 3000 });
        onViolation(type);

        // Auto-remove warning from UI overlay after 5 seconds
        setTimeout(() => {
            setWarnings(prev => prev.filter(w => w !== message));
        }, 5000);

        try {
            // Construct payload
            const payload: any = {
                message,
                timestamp: new Date().toISOString(),
                ...extraPayload
            };

            await apiClient.logProctorEvent(assignmentId, type, payload);
        } catch (error) {
            console.error("Failed to log violation:", error);
        }
    }, [assignmentId, onViolation, gracePeriod, maxWarnings, onTerminate]);

    // --- Strict Security Enforcers ---
    useEffect(() => {
        const handleCopyCutPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            handleViolation("clipboard_attempt", "Copying, cutting, and pasting are disabled.");
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            // handleViolation("context_menu", "Right-click is disabled.");
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // PrintScreen
            if (e.key === 'PrintScreen') {
                handleViolation("screenshot_attempt", "Screenshots are prohibited.");
                document.body.style.filter = "blur(20px)";
                setTimeout(() => { document.body.style.filter = "none"; }, 2000);
            }

            // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
                (e.ctrlKey && e.key === 'U')
            ) {
                e.preventDefault();
                handleViolation("devtools_open", "DevTools usage is prohibited.");
            }

            // Alt+Tab detection (best effort via keydown)
            if (e.altKey && e.key === 'Tab') {
                // We'll let the visibility change handler catch the actual switch, 
                // but we can warn here too if we want.
                // handleViolation("tab_switch_attempt", "Alt+Tab is prohibited.");
            }
        };

        // Attach listeners
        document.addEventListener('copy', handleCopyCutPaste);
        document.addEventListener('cut', handleCopyCutPaste);
        document.addEventListener('paste', handleCopyCutPaste);
        document.addEventListener('contextmenu', handleContextMenu); // Disable right click
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('copy', handleCopyCutPaste);
            document.removeEventListener('cut', handleCopyCutPaste);
            document.removeEventListener('paste', handleCopyCutPaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleViolation]);

    // --- Tab Switching & Blur with Duration ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab hidden (switched away)
                lastBlurTime.current = Date.now();
            } else {
                // Tab visible again
                if (lastBlurTime.current) {
                    const duration = (Date.now() - lastBlurTime.current) / 1000;
                    // Immediate warning for any tab switch
                    handleViolation(
                        "tab_switch",
                        `Tab switching detected! You were away for ${duration.toFixed(1)} seconds.`,
                        { duration_away_seconds: duration }
                    );
                    lastBlurTime.current = null;
                }
            }
        };

        const handleBlur = () => {
            // Window lost focus but might still be visible (e.g. clicking another window on dual monitor)
            // We can treat this as a start of a potential away event if not already hidden
            if (!document.hidden && !lastBlurTime.current) {
                lastBlurTime.current = Date.now();
            }
        };

        const handleFocus = () => {
            if (lastBlurTime.current) {
                const duration = (Date.now() - lastBlurTime.current) / 1000;
                // Immediate warning for focus loss
                handleViolation(
                    "focus_lost",
                    `Window focus lost! You were away for ${duration.toFixed(1)} seconds.`,
                    { duration_away_seconds: duration }
                );
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
    }, [handleViolation]);

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
    }, [permissionsGranted, handleViolation, gracePeriod]);

    // --- Face Detection Logic ---
    useEffect(() => {
        // Initialize FaceDetector if available
        if ('FaceDetector' in window) {
            try {
                // @ts-ignore
                faceDetectorRef.current = new FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
            } catch (e) {
                console.error("FaceDetector initialization failed:", e);
            }
        } else {
            console.warn("FaceDetector API not supported in this browser.");
            // We could log a warning to the backend that face detection is unavailable
        }
    }, []);

    const detectFaces = useCallback(async () => {
        if (!faceDetectorRef.current || !webcamRef.current || !webcamRef.current.video || !isCameraReady) return;

        try {
            const video = webcamRef.current.video;
            if (video.readyState !== 4) return; // Ensure video is ready

            const faces = await faceDetectorRef.current.detect(video);

            // 1. Multiple Faces
            if (faces.length > 1) {
                handleViolation(
                    "multiple_faces",
                    `Multiple faces detected (${faces.length}).`,
                    { faces_count: faces.length }
                );
                faceMissingSince.current = null; // Reset missing timer
            }
            // 2. No Face
            else if (faces.length === 0) {
                if (!faceMissingSince.current) {
                    faceMissingSince.current = Date.now();
                } else {
                    const missingDuration = (Date.now() - faceMissingSince.current) / 1000;
                    // Only warn if missing for > 5 seconds to avoid false positives from movement/lighting
                    if (missingDuration > 5) {
                        // We don't want to spam this every interval, so maybe check if we haven't warned recently?
                        // For now, handleViolation handles debouncing via setWarnings check, 
                        // but we might want to log it periodically or once per "episode".
                        // Let's just log it. The debounce in handleViolation (5s) will prevent total spam.
                        handleViolation(
                            "face_missing",
                            "Face not detected. Please stay in front of the camera.",
                            { duration_missing_seconds: missingDuration }
                        );
                    }
                }
            }
            // 3. One Face (Normal)
            else {
                faceMissingSince.current = null;
            }

        } catch (err) {
            console.error("Face detection error:", err);
        }
    }, [isCameraReady, handleViolation]);

    // Run detection loop
    useEffect(() => {
        if (permissionsGranted && isFullscreen && isCameraReady) {
            const interval = setInterval(detectFaces, 1500); // Check every 1.5s
            return () => clearInterval(interval);
        }
    }, [detectFaces, permissionsGranted, isFullscreen, isCameraReady]);


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
            // Don't stop tracks immediately, let Webcam component handle it or keep it open?
            // Actually, react-webcam needs its own stream. 
            // We just check here. But stopping it is fine, react-webcam will request it again.
            stream.getTracks().forEach(track => track.stop());
            setPermissionsGranted(true);
            // isCameraReady will be set by Webcam onUserMedia
        } catch (err) {
            console.error("Permission denied:", err);
            toast.error("Camera permission is required to start the test.");
            setPermissionsGranted(false);
        }
    }, []);

    // Initial check
    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);


    // --- Render Logic (Enforce Order) ---

    // 1. Camera Permission
    if (!permissionsGranted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center space-y-4">
                    <div className="flex justify-center mb-4">
                        <Camera className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Camera Access Required</h2>
                    <p className="text-muted-foreground">
                        To ensure test integrity, we require camera access. Your video will be monitored by an AI proctor.
                    </p>
                    <Button onClick={checkPermissions} size="lg" className="w-full">
                        Grant Camera Permission
                    </Button>
                </div>
            </div>
        );
    }

    // 2. Fullscreen
    if (!isFullscreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center space-y-4">
                    <div className="flex justify-center mb-4">
                        <Maximize className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Fullscreen Required</h2>
                    <p className="text-muted-foreground">
                        This test requires fullscreen mode. Please enable fullscreen to continue.
                        Exiting fullscreen will be recorded as a violation.
                    </p>
                    <Button onClick={enterFullscreen} size="lg" className="w-full">
                        Enter Fullscreen
                    </Button>
                </div>
            </div>
        );
    }

    // 3. Test Content
    return (
        <div className="relative w-full h-full select-none" onContextMenu={(e) => e.preventDefault()}>
            {/* Draggable Webcam */}
            <div
                style={{
                    position: 'fixed',
                    left: position.x,
                    top: position.y,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none'
                }}
                onMouseDown={handleMouseDown}
                className="w-32 h-24 bg-black rounded-lg overflow-hidden border border-gray-800 shadow-lg z-[100] opacity-80 hover:opacity-100 transition-opacity"
            >
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={128}
                    height={96}
                    onUserMedia={() => setIsCameraReady(true)}
                    className="w-full h-full object-cover pointer-events-none"
                    videoConstraints={{
                        width: 128,
                        height: 96,
                        facingMode: "user"
                    }}
                />
                <div className="absolute top-1 right-1">
                    <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
            </div>

            {/* Warnings Overlay */}
            {warnings.length > 0 && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-none">
                    {warnings.slice(-1).map((w, i) => (
                        <Alert key={i} variant="destructive" className="mb-2 shadow-lg animate-in fade-in slide-in-from-top-5">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>{w}</AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            {children}
        </div>
    );
};

export default ProctoringGuard;
