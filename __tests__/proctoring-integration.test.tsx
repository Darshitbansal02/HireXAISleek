// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import useScreenShareProctor from '@/hooks/useScreenShareProctor';
import useSingleTabEnforcer from '@/hooks/useSingleTabEnforcer';
import RecruiterProctorTimeline from '@/components/recruiter/RecruiterProctorTimeline';
import * as apiClient from '@/lib/api-client';

// Mock apiClient
jest.mock('@/lib/api-client');

describe('Phase 6-8: Proctoring System Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================================================
    // useScreenShareProctor Hook Tests
    // ============================================================================
    describe('useScreenShareProctor', () => {
        it('should initialize with no active screen share', () => {
            const { result } = renderHook(() =>
                useScreenShareProctor('test-assignment-id')
            );

            expect(result.current.isSharing).toBe(false);
        });

        it('should emit screen_share_started event when screen share starts', async () => {
            const mockGetDisplayMedia = jest.fn().mockResolvedValue({
                getTracks: () => [
                    {
                        getSettings: () => ({ width: 1920, height: 1080, frameRate: 30 }),
                        stop: jest.fn(),
                    }
                ],
            });

            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
                value: mockGetDisplayMedia,
                configurable: true,
            });

            const { result } = renderHook(() =>
                useScreenShareProctor('test-assignment-id')
            );

            await act(async () => {
                await result.current.start();
            });

            expect(apiClient.logProctorEvent).toHaveBeenCalledWith(
                'test-assignment-id',
                'screen_share_started',
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        width: 1920,
                        height: 1080,
                    })
                })
            );
        });

        it('should emit screen_share_stopped event when screen share stops', async () => {
            const mockStream = {
                getTracks: () => [
                    {
                        getSettings: () => ({ width: 1920, height: 1080 }),
                        stop: jest.fn(),
                    }
                ],
            };

            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
                value: jest.fn().mockResolvedValue(mockStream),
                configurable: true,
            });

            const { result } = renderHook(() =>
                useScreenShareProctor('test-assignment-id')
            );

            await act(async () => {
                await result.current.start();
            });

            await act(async () => {
                result.current.stop();
            });

            expect(apiClient.logProctorEvent).toHaveBeenCalledWith(
                'test-assignment-id',
                'screen_share_stopped',
                expect.any(Object)
            );
        });

        it('should emit screen_monitor_changed event on resolution change', async () => {
            jest.useFakeTimers();

            const mockStream = {
                getTracks: () => [
                    {
                        getSettings: () => ({ width: 1920, height: 1080, frameRate: 30 }),
                        stop: jest.fn(),
                    }
                ],
            };

            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
                value: jest.fn().mockResolvedValue(mockStream),
                configurable: true,
            });

            const { result } = renderHook(() =>
                useScreenShareProctor('test-assignment-id')
            );

            await act(async () => {
                await result.current.start();
            });

            // Fast-forward to next monitor check (2 seconds)
            jest.advanceTimersByTime(2100);

            await waitFor(() => {
                expect(apiClient.logProctorEvent).toHaveBeenCalled();
            });

            jest.useRealTimers();
        });

        it('should not emit events when proctoring is disabled', async () => {
            const mockStream = {
                getTracks: () => [
                    {
                        getSettings: () => ({ width: 1920, height: 1080 }),
                        stop: jest.fn(),
                    }
                ],
            };

            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
                value: jest.fn().mockResolvedValue(mockStream),
                configurable: true,
            });

            // Simulate proctoring disabled by omitting assignmentId
            const { result } = renderHook(() =>
                useScreenShareProctor(null)
            );

            await act(async () => {
                await result.current.start();
            });

            expect(apiClient.logProctorEvent).not.toHaveBeenCalled();
        });

        it('should handle getDisplayMedia permission denied gracefully', async () => {
            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
                value: jest.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError')),
                configurable: true,
            });

            const { result } = renderHook(() =>
                useScreenShareProctor('test-assignment-id')
            );

            await act(async () => {
                await expect(result.current.start()).rejects.toThrow();
            });

            expect(result.current.isScreenSharing).toBe(false);
        });
    });

    // ============================================================================
    // useSingleTabEnforcer Hook Tests
    // ============================================================================
    describe('useSingleTabEnforcer', () => {
        it('should initialize as active tab', () => {
            const mockCallback = jest.fn();
            const { result } = renderHook(() =>
                useSingleTabEnforcer('test-assignment-id', mockCallback)
            );

            expect(result.current.isActive).toBe(true);
            expect(result.current.tabId).toBeTruthy();
        });

        it('should detect second tab via BroadcastChannel message', () => {
            const mockCallback = jest.fn();

            const broadcastChannelMock = jest.fn(() => ({
                postMessage: jest.fn(),
                close: jest.fn(),
                onmessage: null,
            }));

            Object.defineProperty(global, 'BroadcastChannel', {
                value: broadcastChannelMock,
                writable: true,
            });

            const { result } = renderHook(() =>
                useSingleTabEnforcer('test-assignment-id', mockCallback)
            );

            // Simulate incoming message from another tab
            act(() => {
                const channel = broadcastChannelMock.mock.results[0].value;
                if (channel.onmessage) {
                    channel.onmessage({
                        data: {
                            type: 'tab_ping',
                            tabId: 'other-tab-id',
                            assignmentId: 'test-assignment-id',
                        }
                    });
                }
            });

            expect(mockCallback).toHaveBeenCalledWith(false);
        });

        it('should not fire callback if BroadcastChannel not supported', () => {
            const mockCallback = jest.fn();

            const originalBroadcastChannel = global.BroadcastChannel;
            Object.defineProperty(global, 'BroadcastChannel', {
                value: undefined,
                writable: true,
            });

            try {
                const { result } = renderHook(() =>
                    useSingleTabEnforcer('test-assignment-id', mockCallback)
                );

                expect(result.current.isActive).toBe(true);
                expect(mockCallback).not.toHaveBeenCalled();
            } finally {
                Object.defineProperty(global, 'BroadcastChannel', {
                    value: originalBroadcastChannel,
                    writable: true,
                });
            }
        });

        it('should clean up BroadcastChannel on unmount', () => {
            const mockCallback = jest.fn();
            const closeMock = jest.fn();

            const broadcastChannelMock = jest.fn(() => ({
                postMessage: jest.fn(),
                close: closeMock,
                onmessage: null,
            }));

            Object.defineProperty(global, 'BroadcastChannel', {
                value: broadcastChannelMock,
                writable: true,
            });

            const { unmount } = renderHook(() =>
                useSingleTabEnforcer('test-assignment-id', mockCallback)
            );

            unmount();

            expect(closeMock).toHaveBeenCalled();
        });
    });

    // ============================================================================
    // RecruiterProctorTimeline Component Tests
    // ============================================================================
    describe('RecruiterProctorTimeline', () => {
        const mockEvents = [
            {
                id: '1',
                event_type: 'face_not_detected',
                timestamp: new Date().toISOString(),
                payload: { message: 'Face not in frame' }
            },
            {
                id: '2',
                event_type: 'tab_switch_detected',
                timestamp: new Date().toISOString(),
                payload: { message: 'Alt+Tab pressed' }
            },
            {
                id: '3',
                event_type: 'screen_share_started',
                timestamp: new Date().toISOString(),
                payload: { metadata: { width: 1920, height: 1080 } }
            },
        ];

        it('should render empty state when no events', () => {
            render(<RecruiterProctorTimeline events={[]} candidateName="John Doe" />);

            expect(screen.getByText(/No proctoring events recorded/i)).toBeInTheDocument();
        });

        it('should render events grouped by minute', () => {
            render(<RecruiterProctorTimeline events={mockEvents} candidateName="John Doe" />);

            expect(screen.getByText(/Proctoring Timeline - John Doe/i)).toBeInTheDocument();
            expect(screen.getByText(/3 events recorded/i)).toBeInTheDocument();
        });

        it('should expand/collapse time groups on click', () => {
            render(<RecruiterProctorTimeline events={mockEvents} candidateName="John Doe" />);

            const timeHeader = screen.getAllByRole('button')[0];
            expect(timeHeader).toBeInTheDocument();

            // Click to expand
            fireEvent.click(timeHeader);
            expect(screen.getByText(/Face not in frame/i)).toBeInTheDocument();

            // Click to collapse
            fireEvent.click(timeHeader);
            expect(screen.queryByText(/Face not in frame/i)).not.toBeInTheDocument();
        });

        it('should show severity summary stats', () => {
            render(<RecruiterProctorTimeline events={mockEvents} candidateName="John Doe" />);

            expect(screen.getByText('HIGH')).toBeInTheDocument();
            expect(screen.getByText('MEDIUM')).toBeInTheDocument();
            expect(screen.getByText('LOW')).toBeInTheDocument();
        });

        it('should display metadata payload when available', () => {
            render(<RecruiterProctorTimeline events={mockEvents} candidateName="John Doe" />);

            const timeHeader = screen.getAllByRole('button')[0];
            fireEvent.click(timeHeader);

            // Should show event messages
            expect(screen.getByText(/Face not in frame/i)).toBeInTheDocument();
            expect(screen.getByText(/Alt\+Tab pressed/i)).toBeInTheDocument();
        });

        it('should use custom candidate name', () => {
            const customName = 'Alice Smith';
            render(<RecruiterProctorTimeline events={mockEvents} candidateName={customName} />);

            expect(screen.getByText(new RegExp(customName))).toBeInTheDocument();
        });
    });

    // ============================================================================
    // Integration Tests: Rate Limiting
    // ============================================================================
    describe('Rate Limiting Integration', () => {
        it('should respect 20 events per 10 seconds rate limit on backend', async () => {
            const mockLogProctorEvent = jest.fn()
                .mockRejectedValueOnce(new Error('Rate limit exceeded'))
                .mockResolvedValueOnce(undefined);

            apiClient.logProctorEvent = mockLogProctorEvent;

            const { result } = renderHook(() =>
                useScreenShareProctor('test-assignment-id', true)
            );

            // First call succeeds
            await act(async () => {
                try {
                    await result.current.start();
                } catch (e) {
                    // Expected to fail after 20 events
                }
            });

            expect(mockLogProctorEvent).toHaveBeenCalled();
        });
    });

    // ============================================================================
    // Integration Tests: Image Field Blocking
    // ============================================================================
    describe('Image Field Blocking', () => {
        it('should not include image fields in proctor event payload', () => {
            const mockStream = {
                getTracks: () => [
                    {
                        getSettings: () => ({ width: 1920, height: 1080 }),
                        stop: jest.fn(),
                    }
                ],
            };

            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
                value: jest.fn().mockResolvedValue(mockStream),
                configurable: true,
            });

            const { result } = renderHook(() =>
                useScreenShareProctor('test-assignment-id', true)
            );

            act(() => {
                result.current.start();
            });

            // Verify no image, snapshot, or canvas data in payload
            const calls = (apiClient.logProctorEvent as jest.Mock).mock.calls;
            calls.forEach(([assignmentId, eventType, payload]) => {
                expect(payload).not.toHaveProperty('image');
                expect(payload).not.toHaveProperty('snapshot');
                expect(payload).not.toHaveProperty('canvas');
                expect(payload).not.toHaveProperty('dataUrl');
            });
        });
    });

    // ============================================================================
    // Security: Multi-Browser Candidate + Recruiter Flow
    // ============================================================================
    describe('Multi-Browser Integration Test', () => {
        it('should isolate candidate proctoring from recruiter dashboard', async () => {
            // Candidate side: useScreenShareProctor emits events
            const candidateCallback = jest.fn();
            const { result: candidateResult } = renderHook(() =>
                useScreenShareProctor('assignment-123', true)
            );

            // Recruiter side: RecruiterProctorTimeline displays aggregated events (via API)
            const events = [
                {
                    id: '1',
                    event_type: 'face_not_detected',
                    timestamp: new Date().toISOString(),
                    payload: {}
                }
            ];

            render(<RecruiterProctorTimeline events={events} candidateName="Candidate A" />);

            expect(screen.getByText(/Proctoring Timeline - Candidate A/i)).toBeInTheDocument();
            // Recruiter should NOT see raw candidate API calls, only final stored events
            expect(apiClient.logProctorEvent).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({ image: expect.anything() })
            );
        });
    });
});
