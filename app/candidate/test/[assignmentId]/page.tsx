"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Loader2, Clock, AlertTriangle, LayoutGrid } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// New Components
import TestLayout from '@/components/test/TestLayout';
import QuestionPalette from '@/components/test/QuestionPalette';
import MCQChallenge from '@/components/test/MCQChallenge';
import CodingChallenge from '@/components/test/CodingChallenge';
import MobileBlocker from '@/components/test/MobileBlocker';
import ProctoringGuard from '@/components/test/ProctoringGuard';
import { useSystemIntegrity } from '@/hooks/useSystemIntegrity';

export default function TestPage() {
    const params = useParams();
    const assignmentId = params.assignmentId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<any>(null);
    const [started, setStarted] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [blockReason, setBlockReason] = useState("");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Question State Management
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [statusMap, setStatusMap] = useState<Record<number, 'answered' | 'review' | 'unvisited' | 'current'>>({});

    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("python");
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [warningCount, setWarningCount] = useState(0);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [isTerminating, setIsTerminating] = useState(false); // Immediate UI lock

    // Pre-flight Integrity Check (Must be top level)
    const { isCompromised } = useSystemIntegrity({
        isActive: false, // Only monitoring mode for start screen
        onViolation: () => { }
    });

    // Run Code State
    const [isRunning, setIsRunning] = useState(false);
    const [runResults, setRunResults] = useState<any>(null);
    const [runError, setRunError] = useState<string | null>(null);

    // Scheduled State
    const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

    // Fetch Assignment
    useEffect(() => {
        const fetchAssignment = async () => {
            try {
                const data = await apiClient.getAssignment(assignmentId);
                setAssignment(data);

                if (data.scheduled_at) {
                    const scheduledTime = new Date(data.scheduled_at);
                    if (scheduledTime > new Date()) {
                        setScheduledAt(scheduledTime);
                    }
                }

                if (data.status === "completed") {
                    setStarted(true);
                }

                if (data.status === "started" || data.status === "completed") {
                    if (data.expires_at) {
                        const expires = new Date(data.expires_at).getTime();
                        const now = new Date().getTime();
                        setTimeLeft(Math.max(0, Math.floor((expires - now) / 1000)));
                    }
                }
            } catch (error) {
                toast.error("Failed to load test assignment");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (assignmentId) {
            fetchAssignment();
        }
    }, [assignmentId]);

    // Restore answer when switching questions
    useEffect(() => {
        const savedAnswer = answers[currentQuestionIndex];
        if (savedAnswer) {
            if (savedAnswer.type === 'mcq') {
                setSelectedOption(savedAnswer.value);
            } else {
                setCode(savedAnswer.value);
                setLanguage(savedAnswer.language || "python");
            }
        } else {
            // Reset if no saved answer
            setSelectedOption(null);
            setCode("");
        }
        setRunResults(null);
        setRunError(null);
    }, [currentQuestionIndex]);

    const [, setLastSaved] = useState<Date | null>(null);

    // Save answer locally and to server (Autosave)
    useEffect(() => {
        if (!assignment) return;
        const question = assignment.test.questions[currentQuestionIndex];

        setAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                type: question.q_type,
                value: question.q_type === 'mcq' ? selectedOption : code,
                language: language
            }
        }));

        // Debounced Autosave
        const timer = setTimeout(async () => {
            if (code || selectedOption) {
                try {
                    await apiClient.saveDraft(assignmentId, {
                        question_id: question.id,
                        code: question.q_type === 'mcq' ? (selectedOption || "") : code,
                        language: question.q_type === 'mcq' ? 'text' : language
                    });
                    setLastSaved(new Date());

                    // Mark as answered if there is content
                    setStatusMap(prev => ({ ...prev, [currentQuestionIndex]: 'answered' }));
                } catch (e) {
                    console.error("Autosave failed", e);
                }
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [code, selectedOption, language, currentQuestionIndex, assignment]);

    // Timer
    useEffect(() => {
        if (started && timeLeft !== null && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 0) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0) {
            toast.warning("Time is up! Submitting test...", { duration: 5000 });
            setTimeLeft(null);
            handleFinalSubmit();
        }
    }, [started, timeLeft]);

    const handleViolation = (type: string) => {
        setWarningCount(prev => prev + 1);
        toast.warning(`Violation detected: ${type}`, { duration: 3000 });
    };

    const handleTerminate = async () => {
        setIsTerminating(true); // Lock UI immediately
        toast.error("Test terminated due to excessive violations.", { duration: 5000 });
        setSubmitting(true);
        try {
            await apiClient.finishTest(assignmentId);
        } catch (e) {
            console.error("Force submit failed", e);
        } finally {
            router.push("/candidate");
        }
    };

    const handleMarkReview = (index: number) => {
        setStatusMap(prev => ({
            ...prev,
            [index]: prev[index] === 'review' ? 'unvisited' : 'review'
        }));
    };

    const handleRunCode = async () => {
        if (!code.trim()) return toast.error("Please write some code first");

        setIsRunning(true);
        setRunResults(null);
        setRunError(null);

        try {
            const question = assignment.test.questions[currentQuestionIndex];
            const result = await apiClient.runTest(assignmentId, {
                question_id: question.id,
                code: code,
                language: language
            });

            if (result.results) {
                setRunResults(result.results);
                if (result.results.every((r: any) => r.verdict === 'passed')) {
                    toast.success("All sample tests passed!", { duration: 2000 });
                } else {
                    toast.warning("Some tests failed. Check output.", { duration: 3000 });
                }
            } else {
                setRunError("No results returned");
            }
        } catch (error: any) {
            setRunError(error.message || "Execution failed");
            toast.error("Execution failed");
        } finally {
            setIsRunning(false);
        }
    };

    const handleFinalSubmit = async () => {
        setSubmitting(true);
        try {
            // Ensure current question is saved
            const question = assignment.test.questions[currentQuestionIndex];
            await apiClient.saveDraft(assignmentId, {
                question_id: question.id,
                code: question.q_type === 'mcq' ? (selectedOption || "") : code,
                language: question.q_type === 'mcq' ? 'text' : language
            });

            await apiClient.finishTest(assignmentId);
            toast.success("Test submitted successfully!");
            router.push("/candidate");
        } catch (error) {
            toast.error("Failed to submit test");
        } finally {
            setSubmitting(false);
            setShowConfirmSubmit(false);
        }
    };

    const handleStart = async () => {
        if (scheduledAt && scheduledAt > new Date()) {
            toast.error("It is not yet time to start the test.");
            return;
        }
        try {
            await apiClient.startTest(assignmentId);
            setStarted(true);
            toast.success(assignment.status === 'started' ? "Test Resumed." : "Test started! Good luck.");

            // Refresh assignment data to get updated attempt count / times
            const data = await apiClient.getAssignment(assignmentId);
            setAssignment(data);
            if (data.expires_at) {
                const expires = new Date(data.expires_at).getTime();
                const now = new Date().getTime();
                setTimeLeft(Math.max(0, Math.floor((expires - now) / 1000)));
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setBlockReason(error.response.data.detail || "Access Denied");
                setAccessDenied(true);
            } else {
                toast.error("Failed to start test");
            }
        }
    };

    const [maxWarnings, setMaxWarnings] = useState(5);

    // Fetch Proctoring Config
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const config = await apiClient.getProctoringEventsConfig();
                if (config.settings?.max_warnings) {
                    setMaxWarnings(config.settings.max_warnings);
                }
            } catch (e) {
                console.error("Failed to load proctor settings", e);
            }
        };
        fetchSettings();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }





    if (accessDenied) {
        return (
            <div className="flex items-center justify-center h-screen bg-background p-4">
                <Card className="w-full max-w-md shadow-2xl border-red-200">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                            <AlertTriangle className="w-12 h-12 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-destructive">Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <p className="text-muted-foreground text-lg">{blockReason}</p>
                        <Button variant="outline" onClick={() => router.push("/candidate")} className="w-full">
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!assignment) {
        return <div className="p-8 text-center">Assignment not found.</div>;
    }

    if (assignment.status === 'terminated_fraud' || isTerminating) {
        return (
            <div className="flex items-center justify-center h-screen bg-background p-4 animate-in fade-in duration-500">
                <Card className="w-full max-w-lg shadow-2xl border-destructive/20 bg-destructive/5">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                            {isTerminating ? (
                                <Loader2 className="w-12 h-12 text-destructive animate-spin" />
                            ) : (
                                <div className="p-4 rounded-full bg-destructive/10">
                                    <AlertTriangle className="w-12 h-12 text-destructive" />
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-destructive">
                            {isTerminating ? "Terminating Session..." : "Test Terminated"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <div className="p-4 bg-background rounded-xl border border-destructive/10">
                            <h3 className="font-semibold mb-1">Security Policy Violation</h3>
                            <p className="text-muted-foreground text-sm">
                                The system detected repeated or critical security violations.
                                As per strict proctoring rules, your exam is being terminated.
                            </p>
                        </div>
                        {!isTerminating && (
                            <Button variant="outline" onClick={() => router.push("/candidate")} className="w-full">
                                Return to Dashboard
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }



    // --- SCHEDULED LOCK SCREEN ---
    if (scheduledAt && scheduledAt > new Date()) {
        const timeUntilStart = scheduledAt.getTime() - new Date().getTime();
        const hoursUntil = Math.floor(timeUntilStart / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
        const secondsUntil = Math.floor((timeUntilStart % (1000 * 60)) / 1000);

        return (
            <div className="flex items-center justify-center h-screen bg-background p-4">
                <Card className="w-full max-w-lg shadow-2xl border-primary/10">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                                <Clock className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Test Scheduled
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <p className="text-muted-foreground text-lg">
                            This test is scheduled to start at:
                            <br />
                            <span className="font-semibold text-foreground">
                                {scheduledAt.toLocaleString()}
                            </span>
                        </p>

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-muted rounded-lg border">
                                <span className="text-2xl font-bold">{hoursUntil}</span>
                                <p className="text-xs text-muted-foreground uppercase">Hours</p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg border">
                                <span className="text-2xl font-bold">{minutesUntil}</span>
                                <p className="text-xs text-muted-foreground uppercase">Minutes</p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg border">
                                <span className="text-2xl font-bold">{secondsUntil}</span>
                                <p className="text-xs text-muted-foreground uppercase">Seconds</p>
                            </div>
                        </div>

                        <Button disabled className="w-full" size="lg">
                            Please Wait...
                        </Button>
                        <Button variant="ghost" onClick={() => router.push("/candidate")} className="w-full">
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!started) {
        return (
            <MobileBlocker>
                {/* Pre-flight Blocker */}
                {isCompromised && (
                    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <Card className="w-full max-w-lg shadow-2xl border-destructive/20 bg-destructive/5">
                            <CardHeader className="text-center pb-2">
                                <div className="flex justify-center mb-4">
                                    <div className="p-4 rounded-full bg-destructive/10 animate-pulse">
                                        <AlertTriangle className="w-12 h-12 text-destructive" />
                                    </div>
                                </div>
                                <CardTitle className="text-2xl font-bold tracking-tight text-destructive">
                                    System Integrity Check Failed
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 text-center">
                                <p className="text-muted-foreground text-lg">
                                    We detected an open Developer Tools window or resized viewport.
                                    This is a violation of the exam environment rules.
                                </p>

                                <div className="p-4 bg-background rounded-xl border border-destructive/10 text-left">
                                    <p className="font-semibold text-destructive mb-2">Required Actions:</p>
                                    <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                                        <li>Close Developer Tools (F12 / Ctrl+Shift+I)</li>
                                        <li>Maximize your browser window completely</li>
                                        <li>Ensure no sidebars are docked</li>
                                    </ul>
                                </div>

                                <Button size="lg" className="w-full bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20" onClick={() => window.location.reload()}>
                                    I have fixed it, Refresh Page
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="flex items-center justify-center h-screen bg-background p-4">
                    <Card className="w-full max-w-2xl shadow-2xl border-primary/10">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-3xl font-bold tracking-tight">
                                {assignment.status === 'started' ? `Resume: ${assignment.test.title}` : assignment.test.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p className="text-muted-foreground text-center text-lg">{assignment.test.description}</p>

                            <div className="flex justify-center gap-6">
                                <div className="flex flex-col items-center p-4 bg-muted/50 rounded-xl min-w-[120px]">
                                    <Clock className="w-6 h-6 mb-2 text-primary" />
                                    <span className="font-bold text-xl">{assignment.test.duration_minutes}m</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Duration</span>
                                </div>
                                <div className="flex flex-col items-center p-4 bg-muted/50 rounded-xl min-w-[120px]">
                                    <LayoutGrid className="w-6 h-6 mb-2 text-primary" />
                                    <span className="font-bold text-xl">{assignment.test.questions.length}</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Questions</span>
                                </div>
                            </div>

                            {assignment.status === 'started' && (
                                <div className="p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 text-center">
                                    <p className="font-semibold">You are resuming this test.</p>
                                    <p className="text-sm">Attempts Used: {assignment.attempt_count || 0} / 3</p>
                                </div>
                            )}

                            <Separator />

                            <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-6 rounded-xl border border-yellow-500/20">
                                <h3 className="font-bold mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> Exam Rules
                                </h3>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                                        Fullscreen mode is mandatory. Exiting fullscreen will trigger a warning.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                                        Tab switching, copy-paste, and right-click are disabled and monitored.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                                        Webcam snapshots will be taken periodically for proctoring.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                                        Hiding the screen share bar is NOT a violation.
                                    </li>
                                </ul>
                            </div>

                            <Button onClick={handleStart} className="w-full text-lg h-12 shadow-lg shadow-primary/20" size="lg">
                                {assignment.status === 'started' ? 'Resume Test' : 'Start Test Now'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </MobileBlocker>
        );
    }

    const question = assignment.test.questions[currentQuestionIndex];

    return (
        <MobileBlocker>
            <ProctoringGuard
                assignmentId={assignmentId}
                onViolation={handleViolation}
                maxWarnings={maxWarnings}
                onTerminate={handleTerminate}
            >
                <TestLayout
                    title={assignment.test.title}
                    timeLeft={timeLeft}
                    warningCount={warningCount}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={assignment.test.questions.length}
                    onFinish={() => setShowConfirmSubmit(true)}
                    sidebar={
                        <QuestionPalette
                            questions={assignment.test.questions}
                            currentIndex={currentQuestionIndex}
                            onSelect={setCurrentQuestionIndex}
                            statusMap={statusMap}
                            onMarkReview={handleMarkReview}
                        />
                    }
                >
                    {question.q_type === 'mcq' ? (
                        <MCQChallenge
                            question={question}
                            selectedOption={selectedOption}
                            onSelect={setSelectedOption}
                        />
                    ) : (
                        <div className="h-full flex flex-col">
                            {/* Toolbar for Run Code */}
                            <div className="h-12 border-b flex items-center justify-between px-4 bg-muted/5 shrink-0">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    <span>Auto-saving...</span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleRunCode}
                                    disabled={isRunning}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Run Code
                                </Button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <CodingChallenge
                                    question={question}
                                    code={code}
                                    setCode={setCode}
                                    language={language}
                                    setLanguage={setLanguage}
                                    isRunning={isRunning}
                                    runResults={runResults}
                                    runError={runError}
                                />
                            </div>
                        </div>
                    )}
                </TestLayout>

                {/* Confirmation Dialog */}
                <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Finish Test?</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to quit? You cannot return to the test once submitted.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>Cancel</Button>
                            <Button onClick={handleFinalSubmit} disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Submit"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </ProctoringGuard>
        </MobileBlocker>
    );
}
