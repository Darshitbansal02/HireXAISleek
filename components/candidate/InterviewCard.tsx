"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, ArrowRight } from "lucide-react";
import { parseUTCTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface InterviewCardProps {
    interview: any;
    now: Date;
}

export function InterviewCard({ interview, now }: InterviewCardProps) {
    const router = useRouter();

    // Date Logic
    const scheduledDate = parseUTCTime(interview.scheduled_at) || new Date();
    const timeDiff = scheduledDate.getTime() - now.getTime();

    // Allow joining 10 mins before start until 1 hour after start
    // const canJoin = timeDiff <= 10 * 60 * 1000 && timeDiff > -60 * 60 * 1000;

    // For demo/testing purposes, we might relax this or rely on status
    const canJoin = true;

    const dateStr = scheduledDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = scheduledDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex flex-col p-5 bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            {/* Left accent border */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <Video className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-foreground">Interview</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {dateStr}
                            </span>
                        </div>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-medium">
                    {timeStr}
                </Badge>
            </div>

            <div className="flex items-center justify-between mt-auto">
                <div className="text-xs text-muted-foreground font-medium">
                    {canJoin ? (
                        <span className="text-green-600 flex items-center gap-1">
                            <span className="relative flex h-2 w-2 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live Now
                        </span>
                    ) : (
                        <span>Upcoming</span>
                    )}
                </div>

                <Button
                    size="sm"
                    onClick={() => router.push(`/candidate/interview/${interview.room_id}`)}
                    className={`gap-2 h-8 text-xs ${canJoin ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20" : "bg-muted text-muted-foreground"}`}
                    disabled={!canJoin}
                >
                    Join Room <ArrowRight className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
