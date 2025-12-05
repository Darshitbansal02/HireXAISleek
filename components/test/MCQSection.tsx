import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface MCQSectionProps {
    options: string[];
    selectedOption: string | null;
    onSelect: (value: string) => void;
}

export default function MCQSection({ options, selectedOption, onSelect }: MCQSectionProps) {
    return (
        <div className="h-full flex flex-col bg-muted/5">
            <div className="p-6 border-b bg-background/50 backdrop-blur">
                <h3 className="text-lg font-semibold mb-2">Select your answer</h3>
                <p className="text-sm text-muted-foreground">Choose the best option from the list below.</p>
            </div>

            <ScrollArea className="flex-1 p-6">
                <RadioGroup value={selectedOption || ""} onValueChange={onSelect} className="space-y-4">
                    {options.map((opt, i) => (
                        <Label
                            key={i}
                            htmlFor={`option-${i}`}
                            className={`flex items-start space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:bg-accent/50 ${selectedOption === i.toString()
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-transparent bg-card shadow-sm hover:border-primary/20'
                                }`}
                        >
                            <RadioGroupItem value={i.toString()} id={`option-${i}`} className="mt-1" />
                            <div className="flex-1">
                                <span className="text-base leading-relaxed">{opt}</span>
                            </div>
                        </Label>
                    ))}
                </RadioGroup>
            </ScrollArea>
        </div>
    );
}
