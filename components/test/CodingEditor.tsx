import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Code2, FileJson, Lock } from 'lucide-react';

interface CodingEditorProps {
    question: any;
    onChange: (updatedQuestion: any) => void;
}

export default function CodingEditor({ question, onChange }: CodingEditorProps) {

    // Helper to update nested arrays (examples, hidden_tests)
    const updateArrayItem = (field: string, index: number, key: string, value: string) => {
        const list = [...(question[field] || [])];
        if (!list[index]) list[index] = {};
        list[index][key] = value;
        onChange({ ...question, [field]: list });
    };

    const addArrayItem = (field: string, initial: any) => {
        onChange({ ...question, [field]: [...(question[field] || []), initial] });
    };

    const removeArrayItem = (field: string, index: number) => {
        onChange({ ...question, [field]: (question[field] || []).filter((_: any, i: number) => i !== index) });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Problem Definition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Problem Title</Label>
                        <Input
                            value={question.title}
                            onChange={(e) => onChange({ ...question, title: e.target.value })}
                            placeholder="e.g. Two Sum"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
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
                            <Label>Language</Label>
                            <Select value={question.language || "python"} onValueChange={(v) => onChange({ ...question, language: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="java">Java</SelectItem>
                                    <SelectItem value="cpp">C++</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Topic</Label>
                            <Input
                                value={question.topic || ""}
                                onChange={(e) => onChange({ ...question, topic: e.target.value })}
                                placeholder="e.g. Hash Map"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Problem Description (Markdown)</Label>
                        <Textarea
                            className="min-h-[200px] font-mono text-sm"
                            value={question.description}
                            onChange={(e) => onChange({ ...question, description: e.target.value })}
                            placeholder="Describe the problem, input format, and output format..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Constraints</Label>
                        <Input
                            value={question.constraints}
                            onChange={(e) => onChange({ ...question, constraints: e.target.value })}
                            placeholder="e.g. 1 <= n <= 10^5"
                        />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="testcases">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="testcases"><FileJson className="w-4 h-4 mr-2" /> Test Cases</TabsTrigger>
                    <TabsTrigger value="solution"><Code2 className="w-4 h-4 mr-2" /> Canonical Solution</TabsTrigger>
                </TabsList>

                <TabsContent value="testcases" className="space-y-6 mt-4">
                    {/* Sample Test Cases */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base">Sample Test Cases (Visible to Candidate)</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => addArrayItem('examples', { input: "", output: "", explanation: "" })}>
                                <Plus className="w-4 h-4 mr-2" /> Add Sample
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(question.examples || []).map((ex: any, i: number) => (
                                <div key={i} className="grid gap-3 p-4 border rounded-lg bg-muted/20 relative group">
                                    <Button
                                        variant="ghost" size="icon"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-6 w-6"
                                        onClick={() => removeArrayItem('examples', i)}
                                    >
                                        <Trash className="w-3 h-3" />
                                    </Button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Input</Label>
                                            <Textarea
                                                className="font-mono text-xs min-h-[60px]"
                                                value={ex.input}
                                                onChange={(e) => updateArrayItem('examples', i, 'input', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Output</Label>
                                            <Textarea
                                                className="font-mono text-xs min-h-[60px]"
                                                value={ex.output}
                                                onChange={(e) => updateArrayItem('examples', i, 'output', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Explanation (Optional)</Label>
                                        <Input
                                            className="text-xs"
                                            value={ex.explanation}
                                            onChange={(e) => updateArrayItem('examples', i, 'explanation', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                            {(question.examples || []).length === 0 && <div className="text-sm text-muted-foreground italic text-center py-4">No sample test cases added.</div>}
                        </CardContent>
                    </Card>

                    {/* Hidden Test Cases */}
                    <Card className="border-yellow-500/20 bg-yellow-500/5">
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Lock className="w-4 h-4 text-yellow-600" />
                                Hidden Test Cases (For Grading)
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={() => addArrayItem('hidden_tests', { input: "", output: "" })}>
                                <Plus className="w-4 h-4 mr-2" /> Add Hidden Case
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(question.hidden_tests || []).map((test: any, i: number) => (
                                <div key={i} className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-background relative group">
                                    <Button
                                        variant="ghost" size="icon"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-6 w-6"
                                        onClick={() => removeArrayItem('hidden_tests', i)}
                                    >
                                        <Trash className="w-3 h-3" />
                                    </Button>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Input</Label>
                                        <Textarea
                                            className="font-mono text-xs min-h-[60px]"
                                            value={test.input}
                                            onChange={(e) => updateArrayItem('hidden_tests', i, 'input', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Output</Label>
                                        <Textarea
                                            className="font-mono text-xs min-h-[60px]"
                                            value={test.output}
                                            onChange={(e) => updateArrayItem('hidden_tests', i, 'output', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                            {(question.hidden_tests || []).length === 0 && <div className="text-sm text-muted-foreground italic text-center py-4">No hidden test cases added.</div>}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="solution" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Canonical Solution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                className="font-mono text-sm min-h-[400px]"
                                value={question.canonical_solution}
                                onChange={(e) => onChange({ ...question, canonical_solution: e.target.value })}
                                placeholder="# Write the correct solution here..."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
