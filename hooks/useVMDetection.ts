import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * useVMDetection
 * - Detects if the browser is running inside a virtual machine
 * - Uses WebGL renderer/vendor analysis
 * - Checks hardware concurrency anomalies
 * - Monitors performance timing jitter
 * - Reports to backend for proctor logging
 */

interface VMDetectionResult {
    isVM: boolean;
    confidence: 'low' | 'medium' | 'high';
    indicators: string[];
}

interface UseVMDetectionOptions {
    assignmentId: string;
    isActive: boolean;
    onVMDetected?: (result: VMDetectionResult) => void;
}

// Known VM-related WebGL renderer/vendor strings
const VM_INDICATORS = {
    renderers: [
        'virtualbox',
        'vmware',
        'parallels',
        'qemu',
        'hyper-v',
        'xen',
        'bochs',
        'mesa',
        'llvmpipe',
        'softpipe',
        'swiftshader',
        'microsoft basic render',
        'google swiftshader'
    ],
    vendors: [
        'vmware',
        'virtualbox',
        'parallels',
        'microsoft corporation', // Hyper-V
        'humper', // Some VM detection
        'innotek gmbh' // VirtualBox
    ]
};

export const useVMDetection = ({
    assignmentId,
    isActive,
    onVMDetected
}: UseVMDetectionOptions) => {
    const [detectionResult, setDetectionResult] = useState<VMDetectionResult | null>(null);
    const hasReportedRef = useRef(false);

    const checkWebGL = useCallback((): { isVM: boolean; indicators: string[] } => {
        const indicators: string[] = [];
        let isVM = false;

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            if (gl && gl instanceof WebGLRenderingContext) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)?.toLowerCase() || '';
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)?.toLowerCase() || '';

                    // Check renderer
                    for (const vmRenderer of VM_INDICATORS.renderers) {
                        if (renderer.includes(vmRenderer)) {
                            indicators.push(`WebGL renderer: ${vmRenderer}`);
                            isVM = true;
                        }
                    }

                    // Check vendor
                    for (const vmVendor of VM_INDICATORS.vendors) {
                        if (vendor.includes(vmVendor)) {
                            indicators.push(`WebGL vendor: ${vmVendor}`);
                            isVM = true;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('WebGL detection failed:', e);
        }

        return { isVM, indicators };
    }, []);

    const checkHardwareConcurrency = useCallback((): { isVM: boolean; indicators: string[] } => {
        const indicators: string[] = [];
        let isVM = false;

        const cores = navigator.hardwareConcurrency;

        // VMs often report very low core counts (1-2)
        // Or exactly 1 which is highly suspicious for modern hardware
        if (cores === 1) {
            indicators.push(`Suspicious core count: ${cores} (likely VM)`);
            isVM = true;
        } else if (cores === 2 && window.screen.width >= 1920) {
            // High resolution but only 2 cores is suspicious
            indicators.push(`Low core count (${cores}) with high resolution - possible VM`);
            // Don't mark as definite VM, just add indicator
        }

        return { isVM, indicators };
    }, []);

    const checkPerformanceTiming = useCallback(async (): Promise<{ isVM: boolean; indicators: string[] }> => {
        const indicators: string[] = [];
        let isVM = false;

        // VMs have noticeable timing jitter due to hypervisor overhead
        const timings: number[] = [];

        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            // Small computation
            let sum = 0;
            for (let j = 0; j < 10000; j++) {
                sum += Math.sqrt(j);
            }
            const end = performance.now();
            timings.push(end - start);
            // Small delay between measurements
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Calculate variance in timings
        const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
        const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
        const stdDev = Math.sqrt(variance);

        // High variance (> 50% of average) suggests VM overhead
        if (stdDev > avg * 0.5 && avg > 0.5) {
            indicators.push(`High timing variance: stdDev=${stdDev.toFixed(2)}, avg=${avg.toFixed(2)}`);
            // Don't mark as definite VM, timing can vary on real hardware too
        }

        return { isVM, indicators };
    }, []);

    const checkDeviceMemory = useCallback((): { isVM: boolean; indicators: string[] } => {
        const indicators: string[] = [];
        let isVM = false;

        // @ts-ignore - deviceMemory is not in all browsers
        const memory = navigator.deviceMemory;

        if (memory !== undefined) {
            // Very low memory (< 2GB) with high resolution is suspicious
            if (memory <= 2 && window.screen.width >= 1920) {
                indicators.push(`Low reported memory (${memory}GB) with high resolution`);
                // Weak indicator, don't mark as definite VM
            }
        }

        return { isVM, indicators };
    }, []);

    const checkScreenAnomalies = useCallback((): { isVM: boolean; indicators: string[] } => {
        const indicators: string[] = [];
        let isVM = false;

        const { width, height, availWidth, availHeight, colorDepth } = window.screen;

        // VMs sometimes have unusual color depths
        if (colorDepth < 24) {
            indicators.push(`Unusual color depth: ${colorDepth}`);
        }

        // Check for perfectly square or unusual aspect ratios
        const aspectRatio = width / height;
        if (aspectRatio === 1 || (aspectRatio > 2.5) || (aspectRatio < 1)) {
            indicators.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
        }

        return { isVM, indicators };
    }, []);

    const runDetection = useCallback(async () => {
        const allIndicators: string[] = [];
        let vmConfirmed = false;

        // Run all checks
        const webglResult = checkWebGL();
        allIndicators.push(...webglResult.indicators);
        if (webglResult.isVM) vmConfirmed = true;

        const hardwareResult = checkHardwareConcurrency();
        allIndicators.push(...hardwareResult.indicators);
        if (hardwareResult.isVM) vmConfirmed = true;

        const timingResult = await checkPerformanceTiming();
        allIndicators.push(...timingResult.indicators);

        const memoryResult = checkDeviceMemory();
        allIndicators.push(...memoryResult.indicators);

        const screenResult = checkScreenAnomalies();
        allIndicators.push(...screenResult.indicators);

        // Determine confidence
        let confidence: 'low' | 'medium' | 'high' = 'low';
        if (vmConfirmed) {
            confidence = 'high';
        } else if (allIndicators.length >= 3) {
            confidence = 'medium';
        } else if (allIndicators.length >= 1) {
            confidence = 'low';
        }

        const result: VMDetectionResult = {
            isVM: vmConfirmed || allIndicators.length >= 3,
            confidence,
            indicators: allIndicators
        };

        setDetectionResult(result);
        return result;
    }, [checkWebGL, checkHardwareConcurrency, checkPerformanceTiming, checkDeviceMemory, checkScreenAnomalies]);

    // Log to backend
    const logDetection = useCallback(async (result: VMDetectionResult) => {
        if (!assignmentId || hasReportedRef.current) return;
        hasReportedRef.current = true;

        try {
            await apiClient.logProctorEvent(assignmentId, 'vm_detected', {
                timestamp: new Date().toISOString(),
                severity: result.confidence === 'high' ? 'critical' : 'high',
                isVM: result.isVM,
                confidence: result.confidence,
                indicators: result.indicators,
                message: `Virtual machine detected (confidence: ${result.confidence})`
            });

            onVMDetected?.(result);
        } catch (e) {
            console.error('Failed to log VM detection:', e);
        }
    }, [assignmentId, onVMDetected]);

    // Run detection on mount
    useEffect(() => {
        if (!isActive || !assignmentId) return;

        const detect = async () => {
            const result = await runDetection();
            if (result.isVM) {
                console.warn('🚨 VM DETECTION: Virtual machine detected', result);
                await logDetection(result);
            } else if (result.indicators.length > 0) {
                console.log('ℹ️ VM DETECTION: Some indicators found but not conclusive', result);
            }
        };

        detect();
    }, [isActive, assignmentId, runDetection, logDetection]);

    return {
        detectionResult,
        isVM: detectionResult?.isVM || false,
        confidence: detectionResult?.confidence || null,
        indicators: detectionResult?.indicators || [],
        recheck: runDetection
    };
};

export default useVMDetection;
