"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, AlertCircle, CheckCircle2, FileText, Lock, ChevronRight, Timer, ArrowRight, Hourglass } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AssessmentCardProps {
    test: any;
    now: Date;
}

export function AssessmentCard({ test, now }: AssessmentCardProps) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [canStart, setCanStart] = useState(false);
    const [timeRemainingInWindow, setTimeRemainingInWindow] = useState<string | null>(null);

    // Parse Dates safely
    const scheduledDate = test.scheduled_at ? new Date(test.scheduled_at.endsWith('Z') ? test.scheduled_at : test.scheduled_at + 'Z') : null;

    // Calculate Expiration: Trust backend expires_at OR derive from duration
    let expiresAt = test.expires_at ? new Date(test.expires_at.endsWith('Z') ? test.expires_at : test.expires_at + 'Z') : null;
    if (!expiresAt && scheduledDate && test.test?.duration_minutes) {
        expiresAt = new Date(scheduledDate.getTime() + test.test.duration_minutes * 60000);
    }

    // Status Determination
    const isCompleted = test.status === 'completed';
    // Strict Expiration Check: Use current time vs calculated expiresAt
    const isExpired = expiresAt ? expiresAt < now : false;

    // Check if we are in the "Late Start" window (started, but less than full duration remains)
    const isLateStart = scheduledDate && expiresAt && now > scheduledDate && now < expiresAt;

    const isStarted = test.status === 'started';
    const isPending = test.status === 'pending';

    const attempts = test.attempt_count || 0;
    const maxAttempts = 3;
    const attemptsLeft = maxAttempts - attempts;

    // Timer Effect
    useEffect(() => {
        if (!scheduledDate) return;

        const tick = () => {
            const currentNow = new Date();

            // 1. Countdown to Start
            const timeDiffToStart = scheduledDate.getTime() - currentNow.getTime();

            if (timeDiffToStart <= 0) {
                setCanStart(true);
                setTimeLeft("");
            } else {
                setCanStart(false);
                const hours = Math.floor(timeDiffToStart / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiffToStart % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiffToStart % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }

            // 2. Countdown to Expiration (Window Closing)
            if (expiresAt && currentNow > scheduledDate && currentNow < expiresAt) {
                const timeDiffToExpire = expiresAt.getTime() - currentNow.getTime();
                const minutesLeft = Math.floor(timeDiffToExpire / 60000);
                if (minutesLeft < test.test?.duration_minutes) {
                    setTimeRemainingInWindow(`${minutesLeft}m left in window`);
                } else {
                    setTimeRemainingInWindow(null);
                }
            } else {
                setTimeRemainingInWindow(null);
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [scheduledDate, expiresAt, test.test?.duration_minutes]);

    const handleStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpired) return;
        router.push(`/candidate/test/${test.id}`);
    };

    // COMPLETED STATE CARD
    if (isCompleted) {
        return (
            <div className="group flex items-center justify-between p-5 bg-white dark:bg-card rounded-2xl border border-border/40 hover:border-green-500/20 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => { }}>
                <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 shrink-0">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-base text-foreground truncate pr-4 group-hover:text-green-700 transition-colors">
                            {test.test?.title || "Untitled Assessment"}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                                Completed
                            </Badge>
                            <span>•</span>
                            <span>{test.test?.duration_minutes}m duration</span>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:flex rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                    View Result <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        );
    }

    // ACTIVE / PENDING / EXPIRED STATE CARD
    return (
        <div className="group relative bg-white dark:bg-card rounded-[1.5rem] border border-border/50 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden">

            {/* Left Accent Bar */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5",
                isExpired ? 'bg-red-500' : (isStarted ? 'bg-indigo-500' : 'bg-orange-400')
            )} />

            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">

                {/* Main Info */}
                <div className="flex items-start gap-5 min-w-0 flex-1">
                    {/* Icon Container */}
                    <div className={cn(
                        "h-14 w-14 rounded-2xl flex shrink-0 items-center justify-center shadow-inner",
                        isExpired ? 'bg-red-50 text-red-500 dark:bg-red-900/10' :
                            (isStarted ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/10' :
                                'bg-orange-50 text-orange-500 dark:bg-orange-900/10')
                    )}>
                        {isExpired ? <Clock className="h-7 w-7" /> :
                            (isStarted ? <Play className="h-7 w-7 ml-1" /> :
                                <FileText className="h-7 w-7" />)}
                    </div>

                    {/* Text Details */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-bold text-lg text-foreground">
                                {test.test?.title || "Untitled Assessment"}
                            </h4>
                            {isStarted && <Badge className="bg-indigo-100 text-indigo-700 shadow-none hover:bg-indigo-200 border-none">Live</Badge>}
                        </div>

                        {/* Meta Row */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-medium">
                            <div className="flex items-center gap-1.5">
                                <Timer className="h-4 w-4 opacity-70" />
                                <span>{test.test?.duration_minutes} mins</span>
                            </div>

                            <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />

                            {/* Status Text/Countdown */}
                            {timeLeft && !isStarted ? (
                                <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md text-xs">
                                    Starts in {timeLeft}
                                </span>
                            ) : (
                                !isExpired && isPending ? (
                                    <span className="text-orange-500 flex items-center gap-1">
                                        Pending
                                    </span>
                                ) : isExpired ? (
                                    <span className="text-red-500 font-semibold">Expired</span>
                                ) : (
                                    <span className="text-blue-600 font-semibold">Ready</span>
                                )
                            )}
                        </div>

                        {/* Time Crunch Warning */}
                        {timeRemainingInWindow && !isExpired && !isStarted && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit mt-1 animate-pulse">
                                <Hourglass className="h-3 w-3" />
                                <span>Window closes in {timeRemainingInWindow}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Action Area */}
                <div className="flex items-center sm:justify-end justify-between gap-5 pt-4 md:pt-0 border-t md:border-none border-border/50">

                    {/* Attempts Label */}
                    {!isExpired && !isCompleted && attemptsLeft > 0 && (
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Attempts</span>
                            <span className="text-xs font-bold text-foreground">{attemptsLeft} / {maxAttempts} left</span>
                        </div>
                    )}

                    {/* Primary Button */}
                    <div className="shrink-0">
                        {!isExpired && (canStart || isStarted) && !isCompleted ? (
                            <Button
                                onClick={handleStart}
                                className={cn(
                                    "rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 px-6 h-11",
                                    "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                                )}
                            >
                                {isStarted ? "Resume Test" : "Start Assessment"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : !isExpired && !canStart && !isCompleted ? (
                            <Button disabled variant="secondary" className="rounded-xl px-6 h-11 bg-muted/60 text-muted-foreground">
                                <Lock className="h-4 w-4 mr-2" />
                                Locked
                            </Button>
                        ) : isExpired ? (
                            <Badge variant="secondary" className="h-9 px-4 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200">
                                Missed / Expired
                            </Badge>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}