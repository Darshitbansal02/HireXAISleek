import React, { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

interface WebcamMonitorProps {
    attemptId: number;
    intervalSeconds?: number;
}

export function WebcamMonitor({ attemptId, intervalSeconds = 30 }: WebcamMonitorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let intervalId: NodeJS.Timeout;

        const startMonitoring = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                intervalId = setInterval(captureAndUpload, intervalSeconds * 1000);
            } catch (err) {
                console.error("Webcam access denied:", err);
            }
        };

        const captureAndUpload = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const context = canvasRef.current.getContext('2d');
            if (!context) return;

            context.drawImage(videoRef.current, 0, 0, 640, 480);

            canvasRef.current.toBlob(async (blob) => {
                if (blob) {
                    const file = new File([blob], "snapshot.jpg", { type: "image/jpeg" });
                    try {
                        // We need to implement this method in api-client first, but for now assuming it exists
                        // or we use a direct fetch if api-client update is pending
                        const formData = new FormData();
                        formData.append("file", file);

                        // Using direct fetch for now to avoid circular dependency if we update api-client later
                        const token = localStorage.getItem("auth_token");
                        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/test/upload-snapshot/${attemptId}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            body: formData
                        });

                    } catch (err) {
                        console.error("Snapshot upload failed:", err);
                    }
                }
            }, 'image/jpeg', 0.7);
        };

        startMonitoring();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            clearInterval(intervalId);
        };
    }, [attemptId, intervalSeconds]);

    return (
        <div className="fixed bottom-4 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden shadow-lg border border-gray-700 z-50">
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
    );
}
