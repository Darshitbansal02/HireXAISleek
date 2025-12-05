import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Loader2 } from 'lucide-react';

interface SubmitBarProps {
    onRun?: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    isRunning?: boolean;
    isLastQuestion: boolean;
    showRunButton: boolean;
}

export default function SubmitBar({
    onRun,
    onSubmit,
    isSubmitting,
    isRunning,
    isLastQuestion,
    showRunButton
}: SubmitBarProps) {
    return (
        <div className="h-16 border-t bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-2">
                {showRunButton && (
                    <Button
                        variant="secondary"
                        onClick={onRun}
                        disabled={isRunning || isSubmitting}
                        className="font-semibold"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        Run Code
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={onSubmit}
                    disabled={isSubmitting || isRunning}
                    size="lg"
                    className={`min-w-[140px] font-bold shadow-lg transition-all ${isLastQuestion
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-primary hover:bg-primary/90'
                        }`}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {isLastQuestion ? "Submit Test" : "Submit Answer"}
                </Button>
            </div>
        </div>
    );
}
