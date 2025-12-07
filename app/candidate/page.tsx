"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { StatsCard } from "@/components/StatsCard";
import { ResumeDoctor } from "@/components/ResumeDoctor";
import { JobCard } from "@/components/JobCard";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import { AIChatbox } from "@/components/AIChatbox";
import { SavedJobs } from "@/components/SavedJobs";
import { RecommendedJobs } from "@/components/RecommendedJobs";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import Link from "next/link";
import { parseUTCTime } from "@/lib/utils";
import { FileText, Briefcase, TrendingUp, Settings, LogOut, Loader, Bookmark, Sparkles, Video, Clock, Play, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { JobDetailModal, Job } from "@/components/JobDetailModal";
import { ProfileSection } from "@/components/ProfileSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { NotificationBell } from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CandidateDashboard() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "saved" | "resume" | "profile">("overview");

    const [jobs, setJobs] = useState<Job[]>([]);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [jobsError, setJobsError] = useState("");

    const [stats, setStats] = useState({
        total_applied: 0,
        profile_views: 0,
        resume_score: 0,
        status_breakdown: {}
    });

    const [profileCompletion, setProfileCompletion] = useState<any>(null);
    const [scheduledInterviews, setScheduledInterviews] = useState<any[]>([]);
    const [assignedTests, setAssignedTests] = useState<any[]>([]);

    const [appliedJobs, setAppliedJobs] = useState<Set<number>>(new Set());
    const [applyingJobs, setApplyingJobs] = useState<Set<number>>(new Set());
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Job detail modal state
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Profile Incomplete Modal State
    const [showIncompleteModal, setShowIncompleteModal] = useState(false);
    const [missingSections, setMissingSections] = useState<string[]>([]);

    // Protect route - redirect if not candidate
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== "candidate")) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, user, router]);

    // Fetch initial data
    useEffect(() => {
        if (isAuthenticated && user?.role === "candidate") {
            fetchJobs();
            fetchStats();
            fetchProfileCompletion();
            fetchInterviews();
            fetchTests();
        }
    }, [isAuthenticated, user, activeTab]);

    const fetchInterviews = async () => {
        try {
            const data = await apiClient.getMyInterviews();
            setScheduledInterviews(data || []);
        } catch (err) {
            console.error("Failed to fetch interviews", err);
        }
    };

    const fetchTests = async () => {
        try {
            const data = await apiClient.listAssignments();
            setAssignedTests(data || []);
        } catch (err) {
            console.error("Failed to fetch tests", err);
        }
    };

    const fetchProfileCompletion = async () => {
        try {
            const data = await apiClient.getProfile();
            if (data && data.profile_completion) {
                setProfileCompletion(data.profile_completion);
            }
        } catch (err) {
            console.error("Failed to fetch profile completion", err);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await apiClient.getCandidateStats();
            if (data) {
                setStats({
                    total_applied: data.total_applied || 0,
                    profile_views: data.profile_views || 0,
                    resume_score: data.resume_score || 0,
                    status_breakdown: data.status_breakdown || {}
                });
            }
        } catch (err) {
            console.error("Failed to fetch stats", err);
            // Keep default stats
        }
    };

    const fetchJobs = async () => {
        setJobsLoading(true);
        setJobsError("");
        try {
            const data = await apiClient.getJobs();
            // Map API response to Job interface
            const mappedJobs: Job[] = (data.jobs || []).map((j: any) => ({
                id: j.id,
                title: j.title,
                description: j.description,
                location: j.location,
                min_experience: j.min_experience,
                skills: Array.isArray(j.skills) ? j.skills.join(", ") : j.skills,
                company: j.company || "Hiring Company",
                type: j.type || "Full-time",
                created_at: j.created_at
            }));
            setJobs(mappedJobs);
        } catch (err: any) {
            let message = "Failed to load jobs";
            if (err.response?.data?.detail) {
                message = err.response.data.detail;
            } else if (err.message) {
                message = err.message;
            }
            setJobsError(message);
        } finally {
            setJobsLoading(false);
        }
    };

    const handleApplyToJob = async (jobId: number) => {
        if (appliedJobs.has(jobId)) {
            setErrorMessage("You have already applied to this job");
            return;
        }

        setApplyingJobs((prev) => new Set([...prev, jobId]));
        setErrorMessage("");
        setSuccessMessage("");

        try {
            await apiClient.applyForJob(jobId);
            setAppliedJobs((prev) => new Set([...prev, jobId]));
            setSuccessMessage("Successfully applied to the job!");
            fetchStats(); // Refresh stats
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            // Enhanced error diagnostics
            console.error("=== JOB APPLICATION ERROR ===");
            console.error("Job ID:", jobId);
            console.error("Error Object:", err);
            console.error("Error Status:", err.status);
            console.error("Error Detail:", err.detail);
            console.error("============================");

            // Check for Profile Incomplete Error (400)
            // ApiClient returns { status, message, detail: response.data }
            // FastAPI returns { detail: { error: "profile_incomplete", ... } }
            // So we look for err.detail.detail.error
            const errorDetail = err.detail?.detail || err.detail;

            if (err.status === 400 && errorDetail?.error === "profile_incomplete") {
                setMissingSections(errorDetail.missing || []);
                setShowIncompleteModal(true);
                // Close job detail modal if open
                setIsModalOpen(false);
                return;
            }

            const message = errorDetail?.message || err.message || "Failed to apply for job";
            setErrorMessage(message);
        } finally {
            setApplyingJobs((prev) => {
                const updated = new Set(prev);
                updated.delete(jobId);
                return updated;
            });
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    const handleJobClick = (job: Job) => {
        setSelectedJob(job);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedJob(null);
    };

    const handleApplyFromModal = async (jobId: number) => {
        await handleApplyToJob(jobId);
        if (!errorMessage) {
            handleCloseModal();
        }
    };

    const displayMessage = () => {
        if (successMessage) {
            return (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
                    {successMessage}
                </div>
            );
        }
        if (errorMessage) {
            return (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {errorMessage}
                </div>
            );
        }
        return null;
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-muted/20">
            <header className="sticky top-0 z-40 border-b border-border/40 glass-strong backdrop-blur-xl">
                <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <img src="/hirexai_logo_premium.png" alt="Logo" className="h-5 w-5" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                            HireXAI
                        </h1>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden md:inline-block">{user?.email}</span>
                        <NotificationBell />
                        <ThemeToggle />
                        <Button variant="ghost" size="icon" data-testid="button-settings" className="hover:bg-primary/10">
                            <Settings className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout" className="hover:bg-destructive/10 hover:text-destructive">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    {displayMessage()}
                    <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.full_name || "Candidate"}!</h2>
                    <p className="text-muted-foreground">Let's find your next opportunity</p>
                </div>

                {profileCompletion && (
                    <div className="mb-6">
                        <ProfileCompletion
                            completion={profileCompletion}
                            onImproveProfile={() => setActiveTab("profile")}
                        />
                    </div>
                )}

                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    <Button
                        variant={activeTab === "overview" ? "default" : "outline"}
                        onClick={() => setActiveTab("overview")}
                        data-testid="tab-overview"
                    >
                        Overview
                    </Button>
                    <Button
                        variant={activeTab === "jobs" ? "default" : "outline"}
                        onClick={() => setActiveTab("jobs")}
                        data-testid="tab-jobs"
                    >
                        All Jobs
                    </Button>
                    <Button
                        variant={activeTab === "saved" ? "default" : "outline"}
                        onClick={() => setActiveTab("saved")}
                        data-testid="tab-saved"
                    >
                        Saved Jobs
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/candidate/builder")}
                        data-testid="tab-builder"
                        className="border-primary/50 text-primary hover:bg-primary/10"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Resume Builder
                    </Button>
                    <Button
                        variant={activeTab === "resume" ? "default" : "outline"}
                        onClick={() => setActiveTab("resume")}
                        data-testid="tab-resume"
                    >
                        Resume Doctor
                    </Button>
                    <Button
                        variant={activeTab === "profile" ? "default" : "outline"}
                        onClick={() => setActiveTab("profile")}
                        data-testid="tab-profile"
                    >
                        My Profile
                    </Button>
                </div>

                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Resume Builder Banner */}
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 rounded-xl border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    Build Your Perfect Resume
                                </h3>
                                <p className="text-muted-foreground">
                                    Create a professional, ATS-friendly resume in minutes with our AI-powered builder.
                                </p>
                            </div>
                            <Button size="lg" onClick={() => router.push("/candidate/builder")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                                Start Building Now
                            </Button>
                        </div>

                        {/* Scheduled Interviews & Tests */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Video className="h-5 w-5 text-primary" />
                                        Scheduled Interviews
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scheduledInterviews.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">No upcoming interviews.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {scheduledInterviews
                                                .filter(interview => interview.status !== 'completed')
                                                .map((interview) => {
                                                    const scheduledDate = parseUTCTime(interview.scheduled_at) || new Date();
                                                    const now = new Date();
                                                    const timeDiff = scheduledDate.getTime() - now.getTime();
                                                    // Allow joining 5 minutes before
                                                    const canJoin = timeDiff <= 5 * 60 * 1000;

                                                    return (
                                                        <div key={interview.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                            <div>
                                                                <p className="font-medium">Interview</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {scheduledDate.toLocaleString(undefined, {
                                                                        dateStyle: 'medium',
                                                                        timeStyle: 'short'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!canJoin && (
                                                                    <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                                                                        Available 5m before
                                                                    </span>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => router.push(`/candidate/interview/${interview.room_id}`)}
                                                                    disabled={!canJoin}
                                                                    title={!canJoin ? "You can join 5 minutes before the scheduled time" : "Join Meeting"}
                                                                >
                                                                    Join
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        Assigned Assessments
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {assignedTests.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">No pending assessments.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {assignedTests.map((test) => {
                                                const scheduledDate = test.scheduled_at ? new Date(test.scheduled_at) : null;
                                                const now = new Date();
                                                const isExpired = test.expires_at && new Date(test.expires_at) < now;
                                                const isFuture = scheduledDate && scheduledDate > now;
                                                const isLate = scheduledDate && scheduledDate < now && test.status === 'pending';

                                                // Resume Logic
                                                const attempts = test.attempt_count || 0;
                                                const maxAttempts = 3;
                                                const canResume = test.status === 'started' && attempts < maxAttempts;
                                                const isMaxAttempts = test.status === 'started' && attempts >= maxAttempts;

                                                // Countdown Logic (Simple inline text for now, could be a component)
                                                const timeUntilStart = isFuture ? (scheduledDate!.getTime() - now.getTime()) : 0;
                                                const hoursUntil = Math.floor(timeUntilStart / (1000 * 60 * 60));
                                                const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

                                                return (
                                                    <div key={test.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                        <div>
                                                            <p className="font-medium">{test.test?.title || "Untitled Test"}</p>
                                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {test.test?.duration_minutes || 0}m</span>
                                                                <span>•</span>
                                                                <span className={`capitalize ${isExpired ? 'text-destructive font-bold' : ''}`}>
                                                                    {isExpired ? 'Expired' : test.status.replace('_', ' ')}
                                                                </span>
                                                                {isLate && !isExpired && (
                                                                    <span className="text-orange-500 font-medium">• Late Start</span>
                                                                )}
                                                                {canResume && !isExpired && (
                                                                    <span className="text-blue-500 font-medium">• {maxAttempts - attempts} attempts left</span>
                                                                )}
                                                                {isFuture && (
                                                                    <span className="text-indigo-500 font-bold flex items-center gap-1">
                                                                        • Starts in {hoursUntil}h {minutesUntil}m
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Status Button */}
                                                        {!isExpired && (test.status === 'pending' || canResume) && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => router.push(`/candidate/test/${test.id}`)}
                                                                variant={canResume ? "outline" : (isLate ? "secondary" : (isFuture ? "ghost" : "default"))}
                                                                disabled={!!isFuture}
                                                                title={isFuture ? `Test starts at ${scheduledDate?.toLocaleString()}` : ""}
                                                            >
                                                                {isFuture ? (
                                                                    <span className="flex items-center gap-2">
                                                                        <Clock className="h-3 w-3" />
                                                                        Wait for Start
                                                                    </span>
                                                                ) : (
                                                                    <>
                                                                        <Play className="h-3 w-3 mr-1" />
                                                                        {canResume ? "Resume Test" : (isLate ? "Start Now" : "Start")}
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}

                                                        {isExpired && (
                                                            <Button size="sm" variant="ghost" disabled className="text-destructive">
                                                                Expired
                                                            </Button>
                                                        )}

                                                        {/* Max Attempts Indicator */}
                                                        {!isExpired && isMaxAttempts && (
                                                            <Button size="sm" variant="ghost" disabled className="text-muted-foreground">
                                                                Max Attempts
                                                            </Button>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <StatsCard
                                title="Applications Sent"
                                value={stats.total_applied.toString()}
                                icon={Briefcase}
                                trend={{ value: "Keep applying", isPositive: true }}
                            />
                            <StatsCard
                                title="Profile Views"
                                value={stats.profile_views.toString()}
                                icon={TrendingUp}
                                trend={{ value: "12%", isPositive: true }}
                            />
                            <StatsCard
                                title="Resume Score"
                                value={`${stats.resume_score || 0}%`}
                                icon={FileText}
                            />
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <ApplicationTracker />
                                <AnalyticsChart
                                    title="Profile Views (Last 7 Days)"
                                    data={[
                                        { name: "Mon", value: 4 },
                                        { name: "Tue", value: 7 },
                                        { name: "Wed", value: 5 },
                                        { name: "Thu", value: 12 },
                                        { name: "Fri", value: 8 },
                                        { name: "Sat", value: 3 },
                                        { name: "Sun", value: 6 },
                                    ]}
                                    type="line"
                                />
                            </div>
                            <div className="space-y-4">
                                <RecommendedJobs
                                    onApply={handleApplyToJob}
                                    appliedJobs={appliedJobs}
                                    applyingJobs={applyingJobs}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "jobs" && (
                    <div>
                        {jobsLoading ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : jobsError ? (
                            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                                {jobsError}
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-12">
                                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                                <p className="text-muted-foreground">No jobs available at the moment. Check back soon!</p>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-2 gap-6">
                                {jobs.map((job) => {
                                    const skillsArr = Array.isArray(job.skills) ? job.skills : (typeof job.skills === 'string' ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : []);
                                    return (
                                        <JobCard
                                            key={job.id}
                                            job={{
                                                ...job,
                                                id: job.id,
                                                company: job.company || 'Hiring Company',
                                                type: job.type || 'Full-time',
                                                postedAt: 'Recently',
                                                matchScore: 85,
                                                skills: skillsArr,
                                                description: job.description,
                                                minExperience: job.min_experience,
                                            }}
                                            onClick={() => handleJobClick(job)}
                                            onApply={() => handleApplyToJob(job.id)}
                                            isApplying={applyingJobs.has(job.id)}
                                            hasApplied={appliedJobs.has(job.id)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "saved" && (
                    <div className="max-w-4xl mx-auto">
                        <SavedJobs />
                    </div>
                )}

                {activeTab === "resume" && (
                    <div className="max-w-6xl mx-auto">
                        <ResumeDoctor />
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="flex justify-center">
                        <ProfileSection onProfileUpdate={fetchProfileCompletion} />
                    </div>
                )}
            </div>

            <JobDetailModal
                job={selectedJob}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onApply={handleApplyFromModal}
                isApplying={selectedJob ? applyingJobs.has(selectedJob.id) : false}
            />

            <Dialog open={showIncompleteModal} onOpenChange={setShowIncompleteModal}>
                <DialogContent className="sm:max-w-md border-destructive/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Profile Incomplete
                        </DialogTitle>
                        <DialogDescription>
                            Please complete the following before applying:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm font-medium mb-2">Missing Sections:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {missingSections.map((section, index) => (
                                <li key={index}>{section}</li>
                            ))}
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowIncompleteModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setShowIncompleteModal(false);
                                setActiveTab("profile");
                            }}
                            className="gap-2"
                        >
                            Go to My Profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AIChatbox />
        </div>
    );
}
