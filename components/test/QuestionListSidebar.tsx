import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash, GripVertical, FileText, Code, Settings } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface QuestionListSidebarProps {
    testDetails: {
        title: string;
        duration_minutes: number;
    };
    onUpdateTestDetails: (details: any) => void;
    questions: any[];
    selectedQuestionIndex: number | null;
    onSelectQuestion: (index: number) => void;
    onAddQuestion: (type: 'mcq' | 'coding') => void;
    onRemoveQuestion: (index: number) => void;
    onReorderQuestion?: (from: number, to: number) => void; // Placeholder for future drag-n-drop
}

export default function QuestionListSidebar({
    testDetails,
    onUpdateTestDetails,
    questions,
    selectedQuestionIndex,
    onSelectQuestion,
    onAddQuestion,
    onRemoveQuestion
}: QuestionListSidebarProps) {
    return (
        <div className="space-y-6">
            {/* Test Settings Section */}
            <Accordion type="single" collapsible defaultValue="settings">
                <AccordionItem value="settings" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-2 font-semibold">
                            <Settings className="w-4 h-4" />
                            Test Settings
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Test Title</Label>
                            <Input
                                value={testDetails.title}
                                onChange={(e) => onUpdateTestDetails({ ...testDetails, title: e.target.value })}
                                placeholder="e.g. Senior React Dev"
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Duration (mins)</Label>
                            <Input
                                type="number"
                                value={testDetails.duration_minutes}
                                onChange={(e) => onUpdateTestDetails({ ...testDetails, duration_minutes: parseInt(e.target.value) || 0 })}
                                className="h-8 text-sm"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Separator />

            {/* Questions List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">Questions ({questions.length})</h3>
                </div>

                <div className="space-y-2">
                    {questions.map((q, i) => (
                        <div
                            key={i}
                            onClick={() => onSelectQuestion(i)}
                            className={`
                                group flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all
                                ${selectedQuestionIndex === i
                                    ? 'bg-primary/5 border-primary shadow-sm'
                                    : 'bg-card hover:bg-accent/50 border-transparent hover:border-border'
                                }
                            `}
                        >
                            <div className="mt-1 text-muted-foreground">
                                {q.q_type === 'mcq' ? <FileText className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                    {q.title || <span className="text-muted-foreground italic">Untitled Question</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                        {q.q_type === 'mcq' ? 'MCQ' : 'Coding'}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground capitalize">{q.difficulty || 'Medium'}</span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveQuestion(i);
                                }}
                            >
                                <Trash className="w-3 h-3 text-destructive" />
                            </Button>
                        </div>
                    ))}

                    {questions.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                            No questions yet
                        </div>
                    )}
                </div>

                {/* Add Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => onAddQuestion('mcq')}>
                        <Plus className="w-3 h-3 mr-2" /> MCQ
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onAddQuestion('coding')}>
                        <Plus className="w-3 h-3 mr-2" /> Coding
                    </Button>
                </div>
            </div>
        </div>
    );
}
