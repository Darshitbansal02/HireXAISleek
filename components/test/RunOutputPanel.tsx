import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, XCircle, Clock, Database, Terminal } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface RunOutputPanelProps {
    isRunning: boolean;
    results: any[] | null;
    error: string | null;
}

export default function RunOutputPanel({ isRunning, results, error }: RunOutputPanelProps) {
    if (isRunning) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <Terminal className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                </div>
                <div className="text-center">
                    <p className="font-medium text-foreground">Running Tests...</p>
                    <p className="text-sm">Compiling and executing your code against sample cases.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 h-full">
                <Card className="border-destructive/50 bg-destructive/5 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-semibold text-destructive">Execution Error</h4>
                            <pre className="text-xs font-mono whitespace-pre-wrap text-destructive/90 bg-destructive/10 p-2 rounded border border-destructive/20">
                                {error}
                            </pre>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Terminal className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Ready to Run</h3>
                <p className="text-sm max-w-xs mt-2">
                    Click "Run Code" to execute your solution against the sample test cases.
                </p>
            </div>
        );
    }

    const passedCount = results.filter(r => r.verdict === 'passed').length;
    const totalCount = results.length;
    const allPassed = passedCount === totalCount;

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                {/* Summary Header */}
                <div className={`
                    p-4 rounded-lg border flex items-center justify-between
                    ${allPassed ? 'bg-green-500/10 border-green-200' : 'bg-yellow-500/10 border-yellow-200'}
                `}>
                    <div className="flex items-center gap-3">
                        {allPassed ? (
                            <div className="bg-green-500 text-white p-2 rounded-full">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        ) : (
                            <div className="bg-yellow-500 text-white p-2 rounded-full">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h3 className={`font-bold ${allPassed ? 'text-green-700' : 'text-yellow-700'}`}>
                                {allPassed ? 'All Sample Tests Passed' : `${passedCount}/${totalCount} Tests Passed`}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {allPassed ? 'Great job! Your code works for the sample inputs.' : 'Check the failed cases below and try again.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Test Cases List */}
                <div className="space-y-4">
                    {results.map((result, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden bg-card">
                            <div className={`
                                px-4 py-3 border-b flex items-center justify-between
                                ${result.verdict === 'passed' ? 'bg-green-500/5' : 'bg-red-500/5'}
                            `}>
                                <div className="flex items-center gap-2">
                                    {result.verdict === 'passed' ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className="font-medium text-sm">Test Case {i + 1}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {result.time || '0'}s
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Database className="w-3 h-3" /> {result.memory || '0'}KB
                                    </div>
                                </div>
                            </div>

                            {result.verdict !== 'passed' && (
                                <div className="p-4 space-y-3 bg-muted/5 text-sm font-mono">
                                    {result.stdout && (
                                        <div>
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Output</span>
                                            <div className="bg-background border p-2 rounded text-foreground">
                                                {result.stdout}
                                            </div>
                                        </div>
                                    )}
                                    {result.stderr && (
                                        <div>
                                            <span className="text-xs font-bold text-destructive uppercase tracking-wider block mb-1">Error</span>
                                            <div className="bg-destructive/5 border-destructive/20 border p-2 rounded text-destructive whitespace-pre-wrap">
                                                {result.stderr}
                                            </div>
                                        </div>
                                    )}
                                    {/* Note: We might not always have expected output for security/logic reasons, but if we do, show it */}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </ScrollArea>
    );
}
