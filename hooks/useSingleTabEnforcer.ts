import { useEffect, useRef } from 'react';

/**
 * useSingleTabEnforcer
 * - Uses BroadcastChannel to detect if multiple tabs are running the same assignment
 * - Does NOT use localStorage (ephemeral, in-memory only)
 * - Emits violation event if multiple tabs detected
 * - Returns whether this tab is the primary/active one
 */
export const useSingleTabEnforcer = (
    assignmentId: string | null,
    onMultipleTabsDetected?: (isActive: boolean) => void
) => {
    const tabIdRef = useRef<string>(Math.random().toString(36).substring(7));
    const isActiveRef = useRef<boolean>(true);
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (!assignmentId) return;

        // Create assignment-specific channel (no storage, ephemeral)
        const channelName = `assignment_${assignmentId}`;
        try {
            const channel = new BroadcastChannel(channelName);
            channelRef.current = channel;

            // Announce this tab opened
            channel.postMessage({
                type: 'TAB_OPENED',
                tabId: tabIdRef.current,
                timestamp: Date.now()
            });

            // Listen for messages from other tabs
            channel.onmessage = (event) => {
                const { type, tabId } = event.data;

                if (type === 'TAB_OPENED' && tabId !== tabIdRef.current) {
                    // Another tab opened the same assignment
                    console.warn(`⚠️ Multiple test tabs detected: ${tabId} also opened assignment ${assignmentId}`);
                    isActiveRef.current = false;

                    // Notify caller that multiple tabs detected
                    if (onMultipleTabsDetected) {
                        onMultipleTabsDetected(false);
                    }
                }

                if (type === 'TAB_CLOSED' && tabId !== tabIdRef.current) {
                    // Another tab closed; we might become active again
                    // For safety, stay inactive (recruit must verify)
                    console.log(`ℹ️ Another tab closed (${tabId}). Still restricting this tab.`);
                }
            };
        } catch (e) {
            console.warn('BroadcastChannel not supported; single-tab enforcement disabled', e);
        }

        // Cleanup on unmount
        return () => {
            try {
                if (channelRef.current) {
                    channelRef.current.postMessage({
                        type: 'TAB_CLOSED',
                        tabId: tabIdRef.current,
                        timestamp: Date.now()
                    });
                    channelRef.current.close();
                    channelRef.current = null;
                }
            } catch (e) {}
        };
    }, [assignmentId, onMultipleTabsDetected]);

    return {
        isActive: isActiveRef.current,
        tabId: tabIdRef.current
    };
};

export default useSingleTabEnforcer;
