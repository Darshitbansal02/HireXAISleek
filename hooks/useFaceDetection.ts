import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface UseFaceDetectionProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onFaceDetected?: (count: number) => void;
    onFaceMissing?: (duration: number) => void;
    onMultipleFaces?: (count: number) => void;
    isActive?: boolean;
}

export function useFaceDetection({
    videoRef,
    onFaceDetected,
    onFaceMissing,
    onMultipleFaces,
    isActive = true
}: UseFaceDetectionProps) {
    const [faceCount, setFaceCount] = useState(0);
    const [isFaceMissing, setIsFaceMissing] = useState(false);
    const [missingSince, setMissingSince] = useState<number | null>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Load of Model
    useEffect(() => {
        const loadModel = async () => {
            try {
                // Use a reliable CDN for weights to avoid local file issues
                // Using justadudewhohacks/face-api.js official weights or similar mirror
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

                // Load only the Tiny Face Detector (lightweight)
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                console.log("FaceAPI Model Loaded");
                setIsModelLoaded(true);
            } catch (error) {
                console.error("Failed to load FaceAPI model:", error);
            }
        };

        loadModel();
    }, []);

    const detect = useCallback(async () => {
        if (!isModelLoaded || !videoRef.current || videoRef.current.readyState !== 4) return;

        // Fix: Prevent "width or height of 0" error
        const video = videoRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        try {
            // Using Tiny Face Detector options explicitly
            // inputSize: 224 is smaller/faster, 320 is standard. scoreThreshold 0.5 default.
            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

            const detections = await faceapi.detectAllFaces(video, options);
            const count = detections.length;

            // Debounce/Update State
            setFaceCount(count);

            if (count > 0) {
                // Face Detected
                if (isFaceMissing) {
                    setIsFaceMissing(false);
                    setMissingSince(null);
                }

                onFaceDetected?.(count);

                if (count > 1) {
                    onMultipleFaces?.(count);
                }
            } else {
                // Face Missing
                if (!isFaceMissing) {
                    setIsFaceMissing(true);
                    setMissingSince(Date.now());
                } else if (missingSince) {
                    const duration = (Date.now() - missingSince) / 1000;
                    onFaceMissing?.(duration);
                }
            }
        } catch (err) {
            console.error("Face detection loop error:", err);
        }
    }, [videoRef, isModelLoaded, onFaceDetected, onFaceMissing, onMultipleFaces, isFaceMissing, missingSince]);

    // Detection Loop
    useEffect(() => {
        if (isActive && isModelLoaded) {
            // Run every 1000ms (1 second) to be lightweight
            intervalRef.current = setInterval(detect, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, isModelLoaded, detect]);

    return {
        faceCount,
        isFaceMissing,
        isSupported: isModelLoaded
    };
}
