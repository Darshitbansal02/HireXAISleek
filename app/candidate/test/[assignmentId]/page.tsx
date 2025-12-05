"use client";

import React, { useEffect, useState } from 'react';
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

export default function TestPage() {
    const params = useParams();
    const assignmentId = params.assignmentId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<any>(null);
    const [started, setStarted] = useState(false);
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

                if (data.status === "started" || data.status === "completed") {
                    setStarted(true);
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

    const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
            toast.warning("Time is up!", { duration: 5000 });
            handleFinalSubmit(); // Auto-submit on timeout
        }
    }, [started, timeLeft]);

    const handleStart = async () => {
        try {
            await apiClient.startTest(assignmentId);
            setStarted(true);
            toast.success("Test started! Good luck.");
            const data = await apiClient.getAssignment(assignmentId);
            setAssignment(data);
            if (data.expires_at) {
                const expires = new Date(data.expires_at).getTime();
                const now = new Date().getTime();
                setTimeLeft(Math.max(0, Math.floor((expires - now) / 1000)));
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                toast.error("Test has not started yet.");
            } else {
                toast.error("Failed to start test");
            }
        }
    };

    const handleViolation = (type: string) => {
        setWarningCount(prev => prev + 1);
        toast.warning(`Violation detected: ${type}`, { duration: 3000 });
    };

    const handleTerminate = async () => {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!assignment) {
        return <div className="p-8 text-center">Assignment not found.</div>;
    }

    if (scheduledAt && scheduledAt > new Date()) {
        return (
            <div className="flex items-center justify-center h-screen bg-background p-4">
                <Card className="w-full max-w-lg shadow-2xl border-primary/10">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl font-bold tracking-tight">Assessment Scheduled</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <div className="flex flex-col items-center justify-center py-8">
                            <Clock className="w-16 h-16 text-primary mb-4 animate-pulse" />
                            <h3 className="text-xl font-semibold mb-2">{assignment.test.title}</h3>
                            <p className="text-muted-foreground">
                                This test is scheduled to start at:
                            </p>
                            <div className="mt-4 px-6 py-3 bg-muted rounded-lg font-mono text-lg font-bold">
                                {scheduledAt.toLocaleString()}
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => router.push("/candidate")} className="w-full">
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!started) {
        return (
            <MobileBlocker>
                <div className="flex items-center justify-center h-screen bg-background p-4">
                    <Card className="w-full max-w-2xl shadow-2xl border-primary/10">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-3xl font-bold tracking-tight">{assignment.test.title}</CardTitle>
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
                                </ul>
                            </div>

                            <Button onClick={handleStart} className="w-full text-lg h-12 shadow-lg shadow-primary/20" size="lg">
                                Start Test Now
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
                maxWarnings={5}
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
                            <DialogTitle>Confirm Submission</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to finish the test? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>Cancel</Button>
                            <Button onClick={handleFinalSubmit} disabled={submitting} variant="destructive">
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Finish Test
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Navigation Buttons (Fixed Bottom) */}
                <div className="fixed bottom-6 right-6 flex gap-2 z-40">
                    <Button
                        variant="secondary"
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="shadow-lg"
                    >
                        Previous
                    </Button>
                    {currentQuestionIndex < assignment.test.questions.length - 1 ? (
                        <Button
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(assignment.test.questions.length - 1, prev + 1))}
                            className="shadow-lg"
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            variant="destructive"
                            onClick={() => setShowConfirmSubmit(true)}
                            className="shadow-lg"
                        >
                            Submit Test
                        </Button>
                    )}
                </div>
            </ProctoringGuard>
        </MobileBlocker>
    );
}
