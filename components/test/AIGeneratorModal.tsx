import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface AIGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (question: any) => void;
    type: 'mcq' | 'coding';
}

export default function AIGeneratorModal({ isOpen, onClose, onGenerate, type }: AIGeneratorModalProps) {
    const [generationType, setGenerationType] = useState<'mcq' | 'coding'>(type);
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("Medium");
    const [language, setLanguage] = useState("python");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any>(null);

    const [sampleCount, setSampleCount] = useState(2);
    const [hiddenCount, setHiddenCount] = useState(5);
    const [count, setCount] = useState(1);

    // Reset type when modal opens with new prop
    useEffect(() => {
        if (isOpen) {
            setGenerationType(type);
        }
    }, [isOpen, type]);

    const handleGenerate = async () => {
        if (!topic) {
            toast.error("Please enter a topic");
            return;
        }
        setLoading(true);
        setPreview(null);
        try {
            const data = await apiClient.generateQuestion("draft", {
                topic,
                difficulty,
                language: generationType === 'coding' ? language : 'text',
                type: generationType,
                sample_count: sampleCount,
                hidden_count: hiddenCount,
                count: count
            });

            // Normalize data (handle array)
            const questions = Array.isArray(data) ? data : [data];

            const normalizedQuestions = questions.map((q: any) => ({
                title: q.title,
                description: q.description,
                difficulty,
                topic,
                q_type: generationType,
                language: generationType === 'coding' ? language : undefined,
                // MCQ specific
                options: q.options || [],
                correct_option: q.correct_option || 0,
                // Coding specific
                constraints: q.constraints || "",
                examples: q.examples || [],
                sample_tests: q.sample_tests || [],
                hidden_tests: q.hidden_tests || [],
                canonical_solution: q.canonical_solution || ""
            }));

            setPreview(normalizedQuestions);
        } catch (error) {
            toast.error("Generation failed. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (preview) {
            // Pass all generated questions as an array
            onGenerate(preview);
            onClose();
            setPreview(null);
            setTopic("");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Generate Question with AI
                    </DialogTitle>
                </DialogHeader>

                {!preview ? (
                    <div className="space-y-4 py-4">
                        <Tabs value={generationType} onValueChange={(v) => setGenerationType(v as 'mcq' | 'coding')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="coding">Coding Challenge</TabsTrigger>
                                <TabsTrigger value="mcq">Multiple Choice</TabsTrigger>
                            </TabsList>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Topic</Label>
                                    <Input
                                        placeholder="e.g. React Hooks, Dynamic Programming"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                    />
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

                            <div className="space-y-2 mt-4">
                                <Label>Number of Questions to Generate</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={count}
                                    onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                                />
                            </div>

                            <TabsContent value="coding" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Language</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="python">Python</SelectItem>
                                            <SelectItem value="javascript">JavaScript</SelectItem>
                                            <SelectItem value="java">Java</SelectItem>
                                            <SelectItem value="cpp">C++</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Sample Test Cases</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={sampleCount}
                                            onChange={(e) => setSampleCount(parseInt(e.target.value) || 2)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hidden Test Cases</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={hiddenCount}
                                            onChange={(e) => setHiddenCount(parseInt(e.target.value) || 5)}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="mcq" className="mt-4">
                                <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground">
                                    <p>AI will generate {count} multiple choice question(s) including:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Clear Question Title and Description</li>
                                        <li>4 Distinguishable Options</li>
                                        <li>One Correct Answer</li>
                                    </ul>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {generationType === 'coding' && (
                            <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground mt-4">
                                <p>AI will generate {count} complete coding challenge(s) including:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Problem Statement & Constraints</li>
                                    <li>{sampleCount} Sample Test Cases (Visible)</li>
                                    <li>{hiddenCount} Hidden Test Cases (Grading)</li>
                                    <li>Canonical Solution (IO Based)</li>
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="bg-green-500/10 text-green-600 p-3 rounded-md text-sm font-medium flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> {preview.length} Question(s) Generated Successfully!
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {preview.map((q: any, idx: number) => (
                                <div key={idx} className="border rounded-md p-4 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline">{generationType === 'mcq' ? 'MCQ' : 'Coding'}</Badge>
                                        <h3 className="font-bold">{q.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{q.description}</p>
                                    {generationType === 'mcq' && (
                                        <div className="space-y-1 mt-2">
                                            {q.options.map((opt: string, i: number) => (
                                                <div key={i} className={`text-sm p-2 rounded border ${i === q.correct_option ? 'bg-green-100 border-green-300' : ''}`}>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    {!preview ? (
                        <Button onClick={handleGenerate} disabled={loading || !topic}>
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Generate {count > 1 ? `(${count})` : ''}
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setPreview(null)}>Try Again</Button>
                            <Button onClick={handleApply}>Add All Questions</Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
