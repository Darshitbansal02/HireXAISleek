import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Circle, Flag, FileText, Code } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface QuestionPaletteProps {
    questions: any[];
    currentIndex: number;
    onSelect: (index: number) => void;
    statusMap: Record<number, 'answered' | 'review' | 'unvisited' | 'current'>;
    onMarkReview: (index: number) => void;
}

export default function QuestionPalette({
    questions,
    currentIndex,
    onSelect,
    statusMap,
    onMarkReview
}: QuestionPaletteProps) {

    // Group questions by type
    const mcqQuestions = questions.map((q, i) => ({ ...q, originalIndex: i })).filter(q => q.q_type === 'mcq');
    const codingQuestions = questions.map((q, i) => ({ ...q, originalIndex: i })).filter(q => q.q_type === 'coding');

    const renderQuestionGrid = (items: any[], title: string, icon: React.ReactNode) => (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
                {icon}
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
                <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {items.map((q) => {
                    const i = q.originalIndex;
                    const status = i === currentIndex ? 'current' : (statusMap[i] || 'unvisited');

                    let variant: "default" | "outline" | "secondary" | "ghost" = "outline";
                    let bgClass = "";
                    let statusIcon = null;

                    switch (status) {
                        case 'current':
                            variant = "default";
                            bgClass = "ring-2 ring-primary ring-offset-2 shadow-md z-10";
                            break;
                        case 'answered':
                            variant = "secondary";
                            bgClass = "bg-green-500/15 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
                            statusIcon = <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 bg-background rounded-full" />;
                            break;
                        case 'review':
                            variant = "secondary";
                            bgClass = "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
                            statusIcon = <Flag className="w-3 h-3 absolute -top-1 -right-1 fill-yellow-500 bg-background rounded-full" />;
                            break;
                        default:
                            variant = "ghost";
                            bgClass = "hover:bg-accent border border-transparent hover:border-border";
                    }

                    return (
                        <TooltipProvider key={i}>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={variant}
                                        className={`h-10 w-full relative font-mono text-sm transition-all ${bgClass}`}
                                        onClick={() => onSelect(i)}
                                    >
                                        {i + 1}
                                        {statusIcon}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="flex flex-col gap-1">
                                    <p className="font-bold">Question {i + 1}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{q.difficulty || 'Medium'} • {status}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background w-full">
            <div className="p-4 border-b bg-muted/10">
                <h3 className="font-semibold text-sm">Question Navigator</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {Object.values(statusMap).filter(s => s === 'answered').length} of {questions.length} answered
                </p>
            </div>

            <ScrollArea className="flex-1 p-4">
                {mcqQuestions.length > 0 && renderQuestionGrid(mcqQuestions, "Multiple Choice", <FileText className="w-3 h-3" />)}
                {mcqQuestions.length > 0 && codingQuestions.length > 0 && <Separator className="my-4" />}
                {codingQuestions.length > 0 && renderQuestionGrid(codingQuestions, "Coding Challenges", <Code className="w-3 h-3" />)}
            </ScrollArea>

            <div className="p-4 border-t bg-muted/5 space-y-3">
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" /> Current
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Answered
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" /> Review
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full border border-dashed border-foreground" /> Unvisited
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => onMarkReview(currentIndex)}
                >
                    <Flag className={`w-3 h-3 mr-2 ${statusMap[currentIndex] === 'review' ? 'fill-yellow-500 text-yellow-600' : ''}`} />
                    {statusMap[currentIndex] === 'review' ? 'Unmark Review' : 'Mark for Review'}
                </Button>
            </div>
        </div>
    );
}
