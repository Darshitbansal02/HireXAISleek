"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock, Monitor, ShieldAlert, Copy, Download, FileCode, Maximize2, WrapText } from 'lucide-react';
import MonacoEditor from '@/components/test/MonacoEditor';
import { useToast } from "@/components/ui/use-toast";

// Sub-component to handle editor state for each submission with enhancements
function SubmissionViewer({ submission }: { submission: any }) {
    const [language, setLanguage] = useState(submission?.language || "python");
    const [code, setCode] = useState(submission?.code || "# No code submitted");
    const [isMaximized, setIsMaximized] = useState(false);
    const [wordWrap, setWordWrap] = useState<"off" | "on">("off");
    const { toast } = useToast();

    // Update state if submission changes
    useEffect(() => {
        if (submission) {
            setLanguage(submission.language);
            setCode(submission.code);
        }
    }, [submission]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({
            title: "Copied to clipboard",
            description: "Code has been copied to your clipboard.",
        });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `submission_${submission?.question_id || "code"}.${language === "python" ? "py" : language === "javascript" ? "js" : "txt"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const toggleWordWrap = () => {
        setWordWrap(prev => prev === "off" ? "on" : "off");
    };

    const EditorContent = ({ height = "300px" }: { height?: string }) => (
        <div className="border rounded-lg overflow-hidden bg-[#1e1e1e] flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3e3e42] shrink-0">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FileCode className="w-4 h-4" />
                    <span>{language}</span>
                    <span className="mx-2 text-gray-600">|</span>
                    <span>{code.split('\n').length} lines</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-gray-400 hover:text-white hover:bg-[#3e3e42] ${wordWrap === 'on' ? 'text-blue-400 bg-[#3e3e42]' : ''}`}
                        onClick={toggleWordWrap}
                        title="Toggle Word Wrap"
                    >
                        <WrapText className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-400 hover:text-white hover:bg-[#3e3e42]"
                        onClick={handleCopy}
                        title="Copy Code"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-400 hover:text-white hover:bg-[#3e3e42]"
                        onClick={handleDownload}
                        title="Download File"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </Button>
                    {!isMaximized && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-gray-400 hover:text-white hover:bg-[#3e3e42]"
                            onClick={() => setIsMaximized(true)}
                            title="Maximize"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div style={{ height: isMaximized ? "calc(100vh - 100px)" : height }} className="w-full">
                <MonacoEditor
                    language={language}
                    setLanguage={setLanguage}
                    code={code}
                    setCode={setCode}
                    readOnly={true}
                    wordWrap={wordWrap}
                    allowCopy={true}
                />
            </div>
        </div>
    );

    return (
        <>
            <EditorContent />

            <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
                <DialogContent className="max-w-[90vw] h-[90vh] p-0 bg-[#1e1e1e] border-[#3e3e42]">
                    <DialogHeader className="px-4 py-2 border-b border-[#3e3e42] bg-[#252526]">
                        <DialogTitle className="text-sm font-normal text-gray-400 flex items-center gap-2">
                            <FileCode className="w-4 h-4" />
                            Submission Viewer (Full Screen)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden p-4 h-full">
                        <EditorContent height="100%" />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function TestResultTable({ results }: { results: any[] }) {
    if (!results || results.length === 0) return <div className="text-muted-foreground text-sm italic mt-2">No execution details available.</div>;

    return (
        <div className="mt-4 border rounded-lg overflow-hidden bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[120px]">Verdict</TableHead>
                        <TableHead className="w-[80px]">Time</TableHead>
                        <TableHead className="w-[100px]">Memory</TableHead>
                        <TableHead>Output / Error</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map((res, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <Badge variant={res.type === 'hidden' ? 'secondary' : 'outline'}>
                                    {res.type === 'hidden' ? 'Hidden' : 'Sample'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={res.verdict === 'passed' ? 'default' : 'destructive'} className="capitalize">
                                    {res.verdict?.replace('_', ' ') || 'Unknown'}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{res.time ? `${res.time}s` : '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{res.memory ? `${res.memory}KB` : '-'}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[400px]">
                                {res.stderr ? (
                                    <div className="text-red-500 whitespace-pre-wrap max-h-[100px] overflow-y-auto custom-scrollbar">
                                        {res.stderr}
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground truncate" title={res.stdout}>
                                        {res.stdout || <span className="italic text-gray-500">No output</span>}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function ProctorTimeline({ logs }: { logs: any[] }) {
    if (!logs || logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                <p>No proctoring violations recorded.</p>
            </div>
        );
    }

    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return (
        <div className="relative pl-8 space-y-8 py-4">
            {/* Vertical Line */}
            <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-border" />

            {sortedLogs.map((log, index) => {
                const isCritical = ['screen_context_violation', 'confirmed_wrong_screen_shared', 'focus_lost_while_screen_sharing', 'ai_api_detected'].includes(log.event_type);
                const isHighSeverity = ['multiple_faces', 'face_missing', 'virtual_device', 'multiple_test_tabs_detected', 'extension_detected', 'clipboard_paste_detected', 'screenshot_attempt', 'devtools_attempt', 'viewport_compromised'].includes(log.event_type);
                const isMediumSeverity = ['tab_switch', 'window_blur', 'fullscreen_exit', 'copy_paste', 'devtools_open', 'screen_monitor_changed', 'screen_share_denied', 'clipboard_attempt', 'keystroke_anomaly', 'focus_lost'].includes(log.event_type);
                const isScreenShareStart = log.event_type === 'screen_share_started';
                const isScreenShareStop = log.event_type === 'screen_share_stopped' || log.event_type === 'screen_share_interrupted';
                const isInfoEvent = ['screen_context_baseline_locked', 'keystroke_baseline_established'].includes(log.event_type);

                let colorClass = isCritical ? "bg-red-600" : isHighSeverity ? "bg-red-500" : isMediumSeverity ? "bg-orange-500" : isInfoEvent ? "bg-blue-500" : "bg-blue-500";
                if (isScreenShareStart) colorClass = "bg-green-500";
                if (isScreenShareStop) colorClass = "bg-gray-500";

                let icon = <CheckCircle className="w-4 h-4 text-white" />;
                if (isCritical) icon = <ShieldAlert className="w-4 h-4 text-white animate-pulse" />;
                else if (isHighSeverity) icon = <AlertTriangle className="w-4 h-4 text-white" />;
                else if (isScreenShareStart || isScreenShareStop) icon = <Monitor className="w-4 h-4 text-white" />;
                else if (log.event_type.includes('screen')) icon = <Monitor className="w-4 h-4 text-white" />;
                else if (isMediumSeverity) icon = <ShieldAlert className="w-4 h-4 text-white" />;

                // Enhanced Titles & Messages
                let title = log.event_type.replace(/_/g, ' ');
                let message = log.payload?.message || "No details provided";

                if (log.event_type === 'screen_context_violation') {
                    title = "Critical Monitor Violation";
                    message = `Screen context changed! ${log.payload.reason || 'Unknown reason'}.`;
                } else if (log.event_type === 'focus_lost_while_screen_sharing') {
                    title = "Suspicious Multitasking";
                } else if (log.event_type === 'confirmed_wrong_screen_shared') {
                    title = "Wrong Interface Shared";
                } else if (log.event_type === 'extension_detected') {
                    title = "Prohibited Extension";
                    message = `Unauthorized browser extension detected: ${log.payload.reason || 'Suspicious Activity'}`;
                    icon = <ShieldAlert className="w-4 h-4 text-white" />;
                } else if (log.event_type === 'screen_context_baseline_locked') {
                    title = "Security Checkpoint";
                    message = "Screen context baseline locked. Monitoring active.";
                    colorClass = "bg-blue-600";
                    icon = <Monitor className="w-4 h-4 text-white" />;
                } else if (log.event_type === 'ai_api_detected') {
                    title = "🚨 AI Service Detected";
                    message = `Candidate accessed AI service: ${log.payload.domain || 'Unknown'}. URL: ${log.payload.url || 'N/A'}`;
                    colorClass = "bg-red-700";
                } else if (log.event_type === 'clipboard_paste_detected') {
                    title = "Large Paste Detected";
                    message = `Candidate pasted ${log.payload.contentLength || 'N/A'} characters. ${log.payload.message || ''}`;
                } else if (log.event_type === 'keystroke_anomaly') {
                    title = "Typing Pattern Anomaly";
                    message = `${log.payload.reason || 'Unusual typing behavior detected'}. WPM: ${log.payload.metrics?.wpm || 'N/A'}`;
                } else if (log.event_type === 'keystroke_baseline_established') {
                    title = "Typing Baseline Set";
                    message = `Normal typing speed: ${log.payload.baseline?.wpm || 'N/A'} WPM`;
                    colorClass = "bg-blue-500";
                }

                return (
                    <div key={log.id || index} className="relative flex items-start group">
                        {/* Dot */}
                        <div className={`absolute -left-[29px] w-8 h-8 rounded-full flex items-center justify-center border-4 border-background ${colorClass} shadow-sm z-10`}>
                            {icon}
                        </div>

                        <div className={`flex-1 bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${isCritical ? 'border-red-200 bg-red-50/10' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-semibold capitalize flex items-center gap-2">
                                        {title}
                                        {isCritical && <Badge variant="destructive" className="text-[10px] h-5">CRITICAL</Badge>}
                                        {isHighSeverity && <Badge variant="destructive" className="text-[10px] h-5">High</Badge>}
                                        {isScreenShareStart && <Badge className="text-[10px] h-5 bg-green-500 hover:bg-green-600">Active</Badge>}
                                    </h4>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                        {new Date(log.timestamp).toLocaleTimeString()} • {new Date(log.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="text-sm bg-muted/30 p-3 rounded-md border border-border/50">
                                {message}

                                {/* Metadata Badges */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {log.payload?.baseline && (
                                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                                            Baseline: {typeof log.payload.baseline === 'object' ? JSON.stringify(log.payload.baseline).slice(0, 20) + '...' : log.payload.baseline}
                                        </Badge>
                                    )}
                                    {log.payload?.current && (
                                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                            Detected: {typeof log.payload.current === 'object' ? JSON.stringify(log.payload.current).slice(0, 20) + '...' : log.payload.current}
                                        </Badge>
                                    )}
                                    {log.payload?.faces_count !== undefined && (
                                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                                            Faces: {log.payload.faces_count}
                                        </Badge>
                                    )}
                                    {log.payload?.duration_missing_seconds !== undefined && (
                                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                                            Missing: {Number(log.payload.duration_missing_seconds).toFixed(1)}s
                                        </Badge>
                                    )}
                                    {log.payload?.duration_away_seconds !== undefined && (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                                            Away: {Number(log.payload.duration_away_seconds).toFixed(1)}s
                                        </Badge>
                                    )}
                                    {log.payload?.metadata?.new_res && (
                                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
                                            Res: {log.payload.metadata.new_res}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function AssignmentDetailPage() {
    const params = useParams();
    const assignmentId = params.assignmentId as string;
    const testId = params.testId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await apiClient.getAssignmentDetailRecruiter(assignmentId);
                setData(res);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [assignmentId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return <div className="p-8">Assignment not found.</div>;
    }

    const { assignment, test, submissions, proctor_logs } = data;

    // Helper to find submission for a question
    const getSubmission = (qId: string) => submissions.find((s: any) => s.question_id === qId);

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Results
            </Button>

            <div className="grid gap-6">
                {/* Header Card */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl mb-2">{test.title}</CardTitle>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Started: {new Date(assignment.started_at).toLocaleString()}</span>
                                    <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Completed: {assignment.completed_at ? new Date(assignment.completed_at).toLocaleString() : 'In Progress'}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold mb-1">{assignment.score}%</div>
                                {assignment.status === 'terminated_fraud' || assignment.status === 'terminated' ? (
                                    <Badge variant="destructive" className="bg-red-700 hover:bg-red-800">
                                        ⚠️ TERMINATED
                                    </Badge>
                                ) : (
                                    <Badge variant={assignment.score >= 70 ? "default" : "destructive"}>
                                        {assignment.score >= 70 ? "Passed" : "Failed"}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Card className="flex-1 bg-muted/50 border-none">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                                    <div>
                                        <div className="text-2xl font-bold">{assignment.warning_count}</div>
                                        <div className="text-sm text-muted-foreground">Warnings</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="flex-1 bg-muted/50 border-none">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Monitor className="w-8 h-8 text-blue-500" />
                                    <div>
                                        <div className="text-2xl font-bold">{proctor_logs.length}</div>
                                        <div className="text-sm text-muted-foreground">Proctor Events</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Termination Summary (if terminated) */}
                        {(assignment.status === 'terminated_fraud' || assignment.status === 'terminated') && (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5" />
                                    Exam Terminated
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                    {assignment.warning_count >= 5
                                        ? `Maximum warning limit reached (${assignment.warning_count}/5 warnings).`
                                        : 'Critical security violation detected.'
                                    }
                                </p>
                                {proctor_logs.length > 0 && (
                                    <div className="text-sm">
                                        <span className="font-medium">Key Violations: </span>
                                        {proctor_logs
                                            .filter((l: any) => ['ai_api_detected', 'screen_context_violation', 'extension_detected', 'confirmed_wrong_screen_shared', 'tab_switch', 'focus_lost_while_screen_sharing'].includes(l.event_type))
                                            .slice(0, 3)
                                            .map((l: any, i: number) => (
                                                <Badge key={i} variant="outline" className="mr-1 text-xs bg-red-50 text-red-600 border-red-200">
                                                    {l.event_type.replace(/_/g, ' ')}
                                                </Badge>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Tabs defaultValue="questions">
                    <TabsList>
                        <TabsTrigger value="questions">Questions & Answers</TabsTrigger>
                        <TabsTrigger value="proctoring">Proctoring Logs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="questions" className="space-y-6">
                        {test.questions.map((q: any, index: number) => {
                            const submission = getSubmission(q.id);
                            const isCorrect = submission?.score === 100;

                            return (
                                <Card key={q.id}>
                                    <CardHeader className="bg-muted/30">
                                        <div className="flex justify-between items-center flex-wrap gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Badge variant="outline" className="shrink-0">Q{index + 1}</Badge>
                                                <Badge className="shrink-0">{q.q_type === 'mcq' ? 'MCQ' : 'Coding'}</Badge>
                                                <span className="font-semibold truncate">{q.title}</span>
                                            </div>
                                            <Badge variant={isCorrect ? "default" : "destructive"} className="shrink-0">
                                                {isCorrect ? "Correct" : "Incorrect"}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="grid md:grid-cols-2 divide-x">
                                            <div className="p-6">
                                                <h4 className="font-semibold mb-2">Problem Description</h4>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{q.description}</p>

                                                {q.q_type === 'mcq' && (
                                                    <div className="space-y-2">
                                                        <h4 className="font-semibold text-sm">Options:</h4>
                                                        {q.options.map((opt: string, i: number) => (
                                                            <div key={i} className={`p-2 rounded border text-sm ${i === q.correct_option ? "bg-green-500/10 border-green-500" : ""}`}>
                                                                {opt} {i === q.correct_option && <CheckCircle className="w-3 h-3 inline text-green-500 ml-2" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-6 bg-muted/10">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-semibold">Candidate's Answer</h4>
                                                    {q.q_type === 'coding' && (
                                                        <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                                                            {isCorrect ? "Passed" : "Failed"}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {q.q_type === 'mcq' ? (
                                                    <div className={`p-3 rounded border font-medium ${isCorrect ? "bg-green-500/10 border-green-500 text-green-700" : "bg-red-500/10 border-red-500 text-red-700"}`}>
                                                        {submission ? q.options[parseInt(submission.code)] : "No Answer"}
                                                    </div>
                                                ) : (
                                                    <SubmissionViewer submission={submission} />
                                                )}

                                                {q.q_type === 'coding' && submission?.execution_summary && (
                                                    <TestResultTable results={submission.execution_summary.details} />
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    <TabsContent value="proctoring">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-primary" />
                                    Proctoring Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProctorTimeline logs={proctor_logs} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
