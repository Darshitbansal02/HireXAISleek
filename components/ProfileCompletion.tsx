"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CompletionItem {
    key: string;
    label: string;
    weight: number;
    completed: boolean;
}

interface ProfileCompletionProps {
    completion: {
        percentage: number;
        items: CompletionItem[];
    };
    onImproveProfile: () => void;
}

export function ProfileCompletion({ completion, onImproveProfile }: ProfileCompletionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Sort items: incomplete first, then by weight (descending)
    const sortedItems = [...completion.items].sort((a, b) => {
        if (a.completed === b.completed) {
            return b.weight - a.weight;
        }
        return a.completed ? 1 : -1;
    });

    const visibleItems = isExpanded ? sortedItems : sortedItems.slice(0, 3);
    const hiddenCount = sortedItems.length - 3;

    return (
        <Card className="border-premium overflow-hidden bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                            Profile Strength
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Complete your profile to stand out to recruiters
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary block leading-none">
                                {completion.percentage}%
                            </span>
                        </div>
                        {/* Circular progress indicator could go here, but linear is fine for now */}
                    </div>
                </div>
                <Progress value={completion.percentage} className="h-2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <AnimatePresence initial={false}>
                        {visibleItems.map((item) => (
                            <motion.div
                                key={item.key}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {item.completed ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-muted-foreground/30 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm ${item.completed ? 'text-muted-foreground line-through opacity-70' : 'font-medium'}`}>
                                        {item.label}
                                    </span>
                                    {!item.completed && (
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                            +{item.weight}%
                                        </span>
                                    )}
                                </div>

                                {!item.completed && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                        onClick={onImproveProfile}
                                    >
                                        Fix <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {sortedItems.length > 3 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground hover:text-foreground"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <>
                                Show Less <ChevronUp className="h-4 w-4 ml-2" />
                            </>
                        ) : (
                            <>
                                Show {hiddenCount} More Items <ChevronDown className="h-4 w-4 ml-2" />
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
