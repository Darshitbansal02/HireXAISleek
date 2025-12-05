"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Loader2, Sparkles, Plus, Trash, CheckCircle2 } from 'lucide-react';

interface QuestionBuilderProps {
    onSave: (question: any) => void;
    onCancel: () => void;
    testId?: string;
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({ onSave, onCancel, testId }) => {
    const [mode, setMode] = useState<"manual" | "ai">("manual");

    // AI State
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("Medium");
    const [generating, setGenerating] = useState(false);

    // Question State
    const [question, setQuestion] = useState({
        title: "",
        description: "",
        constraints: "",
        language: "python",
        examples: [] as any[],
        sample_tests: [] as any[],
        hidden_tests: [] as any[],
        canonical_solution: "",
        q_type: "coding", // coding or mcq
        options: [] as string[], // For MCQ
        correct_option: 0 // Index for MCQ
    });

    const handleGenerate = async () => {
        if (!topic) {
            toast.error("Please enter a topic");
            return;
        }
        setGenerating(true);
        try {
            const data = await apiClient.generateQuestion("draft", {
                topic,
                difficulty,
                language: question.language,
                type: question.q_type // Pass type
            });

            if (question.q_type === 'mcq') {
                setQuestion({
                    ...question,
                    title: data.title,
                    description: data.description,
                    options: data.options || [],
                    correct_option: data.correct_option || 0,
                    q_type: 'mcq'
                });
            } else {
                setQuestion({
                    ...question,
                    title: data.title,
                    description: data.description,
                    constraints: data.constraints,
                    examples: data.examples || [],
                    sample_tests: data.sample_tests || [],
                    hidden_tests: data.hidden_tests || [],
                    canonical_solution: data.canonical_solution || "",
                    q_type: 'coding'
                });
            }
            toast.success("Question generated!");
            setMode("manual");
        } catch (error) {
            toast.error("Generation failed");
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const addExample = () => {
        setQuestion({ ...question, examples: [...question.examples, { input: "", output: "", explanation: "" }] });
    };

    const updateExample = (index: number, field: string, value: string) => {
        const newExamples = [...question.examples];
        newExamples[index][field] = value;
        setQuestion({ ...question, examples: newExamples });
    };

    const removeExample = (index: number) => {
        setQuestion({ ...question, examples: question.examples.filter((_, i) => i !== index) });
    };

    // MCQ Helpers
    const updateOption = (index: number, value: string) => {
        const newOptions = [...(question.options || ["", "", "", ""])];
        newOptions[index] = value;
        setQuestion({ ...question, options: newOptions });
    };

    return (
        <Card className="w-full border-2 border-primary/20">
            <CardHeader>
                <CardTitle>Add Question</CardTitle>
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-2" /> AI Generator</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="space-y-4">
                {mode === "ai" ? (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Question Type</Label>
                                <Select value={question.q_type} onValueChange={v => setQuestion({ ...question, q_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coding">Coding Challenge</SelectItem>
                                        <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Topic</Label>
                                <Input placeholder="e.g. Arrays, React Hooks" value={topic} onChange={e => setTopic(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Difficulty</Label>
                                <Select value={difficulty} onValueChange={setDifficulty}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Easy">Easy</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="Hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={handleGenerate} disabled={generating} className="w-full">
                            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Generate Question
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={question.q_type} onValueChange={v => setQuestion({ ...question, q_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coding">Coding Challenge</SelectItem>
                                        <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={question.title} onChange={e => setQuestion({ ...question, title: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description (Markdown)</Label>
                            <Textarea className="min-h-[100px]" value={question.description} onChange={e => setQuestion({ ...question, description: e.target.value })} />
                        </div>

                        {question.q_type === 'coding' ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Language</Label>
                                        <Select value={question.language} onValueChange={v => setQuestion({ ...question, language: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="python">Python</SelectItem>
                                                <SelectItem value="javascript">JavaScript</SelectItem>
                                                <SelectItem value="cpp">C++</SelectItem>
                                                <SelectItem value="java">Java</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Constraints</Label>
                                        <Input value={question.constraints} onChange={e => setQuestion({ ...question, constraints: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Canonical Solution</Label>
                                    <Textarea className="font-mono text-xs min-h-[150px]" value={question.canonical_solution} onChange={e => setQuestion({ ...question, canonical_solution: e.target.value })} />
                                </div>

                                {/* Examples Section */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Examples</Label>
                                        <Button variant="outline" size="sm" onClick={addExample}><Plus className="w-4 h-4" /></Button>
                                    </div>
                                    {question.examples.map((ex, i) => (
                                        <div key={i} className="grid grid-cols-3 gap-2 items-start border p-2 rounded">
                                            <Input placeholder="Input" value={ex.input} onChange={e => updateExample(i, 'input', e.target.value)} />
                                            <Input placeholder="Output" value={ex.output} onChange={e => updateExample(i, 'output', e.target.value)} />
                                            <div className="flex gap-1">
                                                <Input placeholder="Explanation" value={ex.explanation} onChange={e => updateExample(i, 'explanation', e.target.value)} />
                                                <Button variant="ghost" size="icon" onClick={() => removeExample(i)}><Trash className="w-4 h-4 text-red-500" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <Label>Options</Label>
                                <div className="grid gap-3">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div
                                                className={`w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer ${question.correct_option === i ? 'bg-green-500 text-white border-green-500' : 'border-gray-300'}`}
                                                onClick={() => setQuestion({ ...question, correct_option: i })}
                                            >
                                                {question.correct_option === i && <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <Input
                                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                value={question.options?.[i] || ""}
                                                onChange={(e) => updateOption(i, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground">Click the circle to mark the correct answer.</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={onCancel}>Cancel</Button>
                            <Button onClick={() => onSave(question)}>Save Question</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default QuestionBuilder;
