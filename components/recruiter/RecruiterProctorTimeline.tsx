import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProctorEventInfo, PROCTOR_EVENT_SEVERITY } from '@/lib/test-utils';

interface ProctorEvent {
    id: string;
    event_type: string;
    timestamp: string;
    payload?: Record<string, any>;
}

interface RecruiterProctorTimelineProps {
    events: ProctorEvent[];
    candidateName?: string;
}

/**
 * RecruiterProctorTimeline
 * - Displays metadata-only proctoring events as a timeline
 * - Groups events by minute for readability
 * - Shows severity color-coding (HIGH=red, MEDIUM=yellow, LOW=gray)
 * - No images or snapshots displayed (metadata only)
 */
export const RecruiterProctorTimeline: React.FC<RecruiterProctorTimelineProps> = ({
    events,
    candidateName = 'Candidate'
}) => {
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Group events by minute
    const groupedEvents = useMemo(() => {
        const groups: Record<string, ProctorEvent[]> = {};

        events.forEach((event) => {
            const time = new Date(event.timestamp);
            const key = time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
        });

        return groups;
    }, [events]);

    const getSeverityColor = (eventType: string) => {
        try {
            const info = getProctorEventInfo(eventType);
            if (info.severity === PROCTOR_EVENT_SEVERITY.HIGH) return 'bg-red-500/10 border-red-500/20 text-red-700';
            if (info.severity === PROCTOR_EVENT_SEVERITY.MEDIUM) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700';
            return 'bg-slate-500/10 border-slate-500/20 text-slate-700';
        } catch (e) {
            return 'bg-slate-500/10 border-slate-500/20 text-slate-700';
        }
    };

    const getSeverityIcon = (eventType: string) => {
        try {
            const info = getProctorEventInfo(eventType);
            if (info.severity === PROCTOR_EVENT_SEVERITY.HIGH) return <AlertCircle className="w-4 h-4" />;
            if (info.severity === PROCTOR_EVENT_SEVERITY.MEDIUM) return <Clock className="w-4 h-4" />;
            return <CheckCircle className="w-4 h-4" />;
        } catch (e) {
            return <Clock className="w-4 h-4" />;
        }
    };

    const getEventLabel = (eventType: string) => {
        try {
            return getProctorEventInfo(eventType).label;
        } catch (e) {
            return eventType;
        }
    };

    if (events.length === 0) {
        return (
            <Card className="w-full border-slate-200 bg-white">
                <CardHeader>
                    <CardTitle className="text-lg">Proctoring Timeline - {candidateName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 text-center py-8">No proctoring events recorded.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full border-slate-200 bg-white">
            <CardHeader>
                <CardTitle className="text-lg">Proctoring Timeline - {candidateName}</CardTitle>
                <p className="text-xs text-slate-500 mt-2">{events.length} events recorded (metadata only, no images)</p>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(groupedEvents).map(([timeKey, timeEvents]) => (
                    <div key={timeKey} className="space-y-2">
                        {/* Time Header */}
                        <div className="sticky top-0 bg-slate-50 px-3 py-2 rounded border border-slate-100">
                            <button
                                onClick={() => setExpandedGroup(expandedGroup === timeKey ? null : timeKey)}
                                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 w-full"
                            >
                                <span>{timeKey}</span>
                                <span className="text-slate-400">({timeEvents.length})</span>
                                <span className="ml-auto text-slate-400 text-xs">{expandedGroup === timeKey ? '▾' : '▸'}</span>
                            </button>
                        </div>

                        {/* Events in Group */}
                        {expandedGroup === timeKey && (
                            <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                                {timeEvents.map((event, i) => (
                                    <div
                                        key={event.id || `${timeKey}-${i}`}
                                        className={cn(
                                            'p-3 rounded border text-sm',
                                            getSeverityColor(event.event_type)
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            {getSeverityIcon(event.event_type)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium">{getEventLabel(event.event_type)}</p>
                                                {event.payload?.message && (
                                                    <p className="text-xs opacity-75 mt-1">{event.payload.message}</p>
                                                )}
                                                {event.payload?.metadata && (
                                                    <p className="text-xs opacity-60 mt-1 font-mono">
                                                        {JSON.stringify(event.payload.metadata).substring(0, 50)}...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Summary Stats */}
                <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="text-xs text-slate-500">HIGH</p>
                        <p className="text-lg font-bold text-red-600">
                            {events.filter(e => {
                                try {
                                    return getProctorEventInfo(e.event_type).severity === PROCTOR_EVENT_SEVERITY.HIGH;
                                } catch {
                                    return false;
                                }
                            }).length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">MEDIUM</p>
                        <p className="text-lg font-bold text-yellow-600">
                            {events.filter(e => {
                                try {
                                    return getProctorEventInfo(e.event_type).severity === PROCTOR_EVENT_SEVERITY.MEDIUM;
                                } catch {
                                    return false;
                                }
                            }).length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">LOW</p>
                        <p className="text-lg font-bold text-slate-600">
                            {events.filter(e => {
                                try {
                                    return getProctorEventInfo(e.event_type).severity === PROCTOR_EVENT_SEVERITY.LOW;
                                } catch {
                                    return false;
                                }
                            }).length}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default RecruiterProctorTimeline;
