import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MCQChallengeProps {
    question: any;
    selectedOption: string | null;
    onSelect: (value: string) => void;
}

export default function MCQChallenge({ question, selectedOption, onSelect }: MCQChallengeProps) {
    return (
        <div className="h-full flex flex-col md:flex-row bg-background">
            {/* Left: Question Statement */}
            <div className="flex-1 border-r flex flex-col min-w-0">
                <ScrollArea className="flex-1">
                    <div className="p-8 max-w-3xl mx-auto">
                        <div className="mb-6">
                            <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
                                Multiple Choice
                            </Badge>
                            <h2 className="text-2xl font-bold leading-tight">
                                {question.title}
                            </h2>
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed text-muted-foreground">
                            {question.description}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Right: Options */}
            <div className="w-full md:w-[400px] bg-muted/5 flex flex-col border-l shrink-0">
                <div className="p-6 border-b bg-background/50 backdrop-blur">
                    <h3 className="font-semibold mb-1">Select Answer</h3>
                    <p className="text-sm text-muted-foreground">Choose the correct option.</p>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <RadioGroup value={selectedOption || ""} onValueChange={onSelect} className="space-y-4">
                        {question.options.map((opt: string, i: number) => (
                            <Label
                                key={i}
                                htmlFor={`option-${i}`}
                                className={`
                                    flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer group select-none
                                    ${selectedOption === i.toString()
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-transparent bg-card shadow-sm hover:border-primary/20 hover:bg-accent/50'
                                    }
                                `}
                            >
                                <RadioGroupItem value={i.toString()} id={`option-${i}`} className="mt-1 shrink-0" />
                                <div className="flex-1 pt-0.5">
                                    <span className={`text-base font-medium ${selectedOption === i.toString() ? 'text-primary' : 'text-foreground'}`}>
                                        {opt}
                                    </span>
                                </div>
                                <div className={`
                                    w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                                    ${selectedOption === i.toString()
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted text-muted-foreground border-border group-hover:border-primary/50'
                                    }
                                `}>
                                    {String.fromCharCode(65 + i)}
                                </div>
                            </Label>
                        ))}
                    </RadioGroup>
                </ScrollArea>
            </div>
        </div>
    );
}
