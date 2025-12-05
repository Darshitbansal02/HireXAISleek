import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Menu, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface TestLayoutProps {
    title: string;
    timeLeft: number | null;
    warningCount: number;
    currentQuestionIndex: number;
    totalQuestions: number;
    sidebar: React.ReactNode;
    children: React.ReactNode;
    onFinish: () => void;
}

export default function TestLayout({
    title,
    timeLeft,
    warningCount,
    currentQuestionIndex,
    totalQuestions,
    sidebar,
    children,
    onFinish
}: TestLayoutProps) {

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isLowTime = timeLeft !== null && timeLeft < 300; // 5 minutes

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
            {/* Sticky Header */}
            <header className="h-16 border-b flex items-center justify-between px-4 bg-card shrink-0 z-40 shadow-sm relative">
                <div className="flex items-center gap-4">
                    {/* Mobile Sidebar Trigger */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[300px]">
                            {sidebar}
                        </SheetContent>
                    </Sheet>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-bold text-primary">
                            H
                        </div>
                        <span className="font-bold text-lg tracking-tight hidden sm:block truncate max-w-[200px]" title={title}>
                            {title}
                        </span>
                    </div>

                    <Separator orientation="vertical" className="h-6 hidden md:block" />

                    <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Question</span>
                        <Badge variant="secondary" className="font-mono text-base px-2">
                            {currentQuestionIndex + 1} <span className="text-muted-foreground/50 mx-1">/</span> {totalQuestions}
                        </Badge>
                    </div>
                </div>

                {/* Center: Timer (Absolute centered for focus) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
                    {timeLeft !== null && (
                        <div className={`
                            flex items-center gap-3 px-4 py-1.5 rounded-full font-mono font-bold text-xl border transition-colors
                            ${isLowTime
                                ? 'bg-red-500/10 text-red-600 border-red-200 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                : 'bg-secondary/50 border-transparent text-foreground'
                            }
                        `}>
                            <Clock className={`w-5 h-5 ${isLowTime ? 'animate-bounce' : ''}`} />
                            {formatTime(timeLeft)}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Warnings */}
                    {warningCount > 0 && (
                        <Badge variant="destructive" className="animate-pulse shadow-sm px-3 py-1">
                            <AlertTriangle className="w-3 h-3 mr-2" />
                            {warningCount} Warning{warningCount > 1 ? 's' : ''}
                        </Badge>
                    )}

                    <Button
                        variant={isLowTime ? "destructive" : "default"}
                        onClick={onFinish}
                        className="shadow-lg shadow-primary/20 font-semibold"
                    >
                        Finish Test
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex relative">
                {/* Desktop Sidebar */}
                <div className="hidden md:block h-full border-r z-30 w-[280px] shrink-0 bg-muted/5">
                    {sidebar}
                </div>

                {/* Workspace */}
                <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                    {children}
                </div>
            </div>
        </div>
    );
}
