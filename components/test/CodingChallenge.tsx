import React, { useState } from 'react';
import MonacoEditor from './MonacoEditor';
import RunOutputPanel from './RunOutputPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Code2, Terminal, FileText } from 'lucide-react';

interface CodingChallengeProps {
    question: any;
    code: string;
    setCode: (code: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
    isRunning: boolean;
    runResults: any;
    runError: string | null;
}

export default function CodingChallenge({
    question,
    code,
    setCode,
    language,
    setLanguage,
    isRunning,
    runResults,
    runError
}: CodingChallengeProps) {
    const [rightPanelTab, setRightPanelTab] = useState("output");

    const BOILERPLATES: Record<string, string> = {
        python: `import sys

def solve():
    # Write your code here
    pass

if __name__ == "__main__":
    solve()`,
        javascript: `// Write your code here
function solve() {
    console.log("Hello World");
}

solve();`,
        java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Write your code here
        
    }
}`,
        cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    // Write your code here
    
    return 0;
}`
    };

    // Handle language change with boilerplate injection
    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        // Only inject if code is empty or matches another boilerplate (simple check)
        // Or just always inject if the user switches language implies they want to start over in that language?
        // Let's be safe: if code is empty or looks like a default template, switch it.
        // For now, let's just inject the new boilerplate if the current code is essentially empty or one of the other boilerplates.
        // A simple heuristic: if code length < 50 or it is in the list of boilerplates.
        const isDefault = Object.values(BOILERPLATES).some(b => b.trim() === code.trim()) || !code.trim();

        if (isDefault) {
            setCode(BOILERPLATES[newLang] || "");
        }
    };

    // Initialize code if empty
    React.useEffect(() => {
        if (!code.trim() && BOILERPLATES[language]) {
            setCode(BOILERPLATES[language]);
        }
    }, []);

    return (
        <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left: Problem Description */}
            <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
                <div className="h-full flex flex-col bg-background border-r">
                    <div className="h-10 border-b flex items-center px-4 bg-muted/10 shrink-0">
                        <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm font-medium">Problem Description</span>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-6 max-w-3xl mx-auto">
                            <div className="mb-6">
                                <Badge variant="outline" className="mb-2 bg-purple-50 text-purple-700 border-purple-200">
                                    Coding Challenge
                                </Badge>
                                <h2 className="text-2xl font-bold leading-tight">
                                    {question.title}
                                </h2>
                            </div>

                            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                {question.description}
                            </div>

                            {question.constraints && (
                                <div className="mt-8">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Constraints</h3>
                                    <div className="bg-muted/50 p-3 rounded-lg border font-mono text-xs">
                                        {question.constraints}
                                    </div>
                                </div>
                            )}

                            {question.examples && question.examples.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Examples</h3>
                                    <div className="space-y-4">
                                        {question.examples.map((ex: any, i: number) => (
                                            <div key={i} className="rounded-lg border bg-card overflow-hidden">
                                                <div className="px-3 py-1.5 bg-muted/30 border-b text-[10px] font-bold text-muted-foreground uppercase">
                                                    Example {i + 1}
                                                </div>
                                                <div className="p-3 space-y-3 text-sm">
                                                    <div>
                                                        <span className="font-semibold text-muted-foreground block mb-1 text-xs">Input:</span>
                                                        <code className="bg-muted px-2 py-1 rounded font-mono block w-fit text-xs">{ex.input}</code>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-muted-foreground block mb-1 text-xs">Output:</span>
                                                        <code className="bg-muted px-2 py-1 rounded font-mono block w-fit text-xs">{ex.output}</code>
                                                    </div>
                                                    {ex.explanation && (
                                                        <div className="text-muted-foreground bg-blue-500/5 p-2 rounded border border-blue-500/10 text-xs">
                                                            <span className="font-semibold text-blue-600 block mb-0.5">Explanation:</span>
                                                            {ex.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right: Code Editor & Output */}
            <ResizablePanel defaultSize={60}>
                <ResizablePanelGroup direction="vertical">
                    {/* Top: Editor */}
                    <ResizablePanel defaultSize={70} minSize={30}>
                        <div className="h-full flex flex-col bg-background">
                            <div className="h-10 border-b flex items-center px-4 bg-muted/10 shrink-0 justify-between">
                                <div className="flex items-center">
                                    <Code2 className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm font-medium">Code Editor</span>
                                </div>
                                {/* Language selector could go here if we want to move it out of MonacoEditor */}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <MonacoEditor
                                    language={language}
                                    setLanguage={handleLanguageChange}
                                    code={code}
                                    setCode={setCode}
                                    allowCopy={false}
                                    theme="vs-dark"
                                    fontSize={14}
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Bottom: Output */}
                    <ResizablePanel defaultSize={30} minSize={10}>
                        <div className="h-full flex flex-col bg-background border-t">
                            <div className="h-10 border-b flex items-center px-2 bg-muted/10 shrink-0">
                                <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="w-full">
                                    <TabsList className="h-8 bg-transparent p-0">
                                        <TabsTrigger
                                            value="output"
                                            className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 text-xs"
                                        >
                                            <Terminal className="w-3 h-3 mr-2" /> Output
                                        </TabsTrigger>
                                        {/* Future: Add "Console" or "Notes" tabs */}
                                    </TabsList>
                                </Tabs>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <RunOutputPanel
                                    isRunning={isRunning}
                                    results={runResults}
                                    error={runError}
                                />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}
