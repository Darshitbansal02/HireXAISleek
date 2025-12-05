import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MCQEditorProps {
    question: any;
    onChange: (updatedQuestion: any) => void;
}

export default function MCQEditor({ question, onChange }: MCQEditorProps) {
    const options = question.options || ["", "", "", ""];

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange({ ...question, options: newOptions });
    };

    const addOption = () => {
        onChange({ ...question, options: [...options, ""] });
    };

    const removeOption = (index: number) => {
        const newOptions = options.filter((_: any, i: number) => i !== index);
        // Adjust correct option if needed
        let newCorrect = question.correct_option;
        if (index < newCorrect) newCorrect--;
        else if (index === newCorrect) newCorrect = 0;

        onChange({ ...question, options: newOptions, correct_option: newCorrect });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Question Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Question Title</Label>
                        <Input
                            value={question.title}
                            onChange={(e) => onChange({ ...question, title: e.target.value })}
                            placeholder="e.g. Time Complexity of QuickSort"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <Select value={question.difficulty || "Medium"} onValueChange={(v) => onChange({ ...question, difficulty: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Easy">Easy</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Topic</Label>
                            <Input
                                value={question.topic || ""}
                                onChange={(e) => onChange({ ...question, topic: e.target.value })}
                                placeholder="e.g. Algorithms"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Question Text (Markdown supported)</Label>
                        <Textarea
                            className="min-h-[120px] font-mono text-sm"
                            value={question.description}
                            onChange={(e) => onChange({ ...question, description: e.target.value })}
                            placeholder="Type your question here..."
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Answer Options</CardTitle>
                    <Button variant="outline" size="sm" onClick={addOption}>
                        <Plus className="w-4 h-4 mr-2" /> Add Option
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        {options.map((opt: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 group">
                                <div className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100">
                                    <GripVertical className="w-4 h-4" />
                                </div>

                                <div
                                    className={`
                                        w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition-colors
                                        ${question.correct_option === i
                                            ? 'bg-green-500 text-white border-green-500 shadow-sm'
                                            : 'border-muted-foreground/30 hover:border-primary/50'
                                        }
                                    `}
                                    onClick={() => onChange({ ...question, correct_option: i })}
                                    title="Mark as correct answer"
                                >
                                    {question.correct_option === i ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-medium text-muted-foreground">{String.fromCharCode(65 + i)}</span>}
                                </div>

                                <Input
                                    value={opt}
                                    onChange={(e) => updateOption(i, e.target.value)}
                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                    className={question.correct_option === i ? "border-green-500 ring-1 ring-green-500/20" : ""}
                                />

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeOption(i)}
                                    disabled={options.length <= 2}
                                >
                                    <Trash className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Click the circle letter to mark the correct answer.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
