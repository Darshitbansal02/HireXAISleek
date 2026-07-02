"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";

// Components
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import { SavedJobs } from "@/components/SavedJobs";
import { ResumeDoctor } from "@/components/ResumeDoctor";
import { ProfileSection } from "@/components/ProfileSection";
import { JobCard } from "@/components/JobCard";
import { JobDetailModal, Job } from "@/components/JobDetailModal";
import { AIChatbox } from "@/components/AIChatbox";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Search, Briefcase } from "lucide-react";

// New Check Modules
import { Sidebar } from "@/components/candidate/Sidebar";
import { Overview } from "@/components/candidate/Overview";

export default function CandidateDashboard() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "saved" | "applications" | "resume" | "profile">("overview");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data State
    const [isMounted, setIsMounted] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [stats, setStats] = useState({ total_applied: 0, profile_views: 0, resume_score: 0 });
    const [scheduledInterviews, setScheduledInterviews] = useState<any[]>([]);
    const [assignedTests, setAssignedTests] = useState<any[]>([]);
    const [profileCompletion, setProfileCompletion] = useState<any>(null);
    const [now, setNow] = useState<Date | null>(null);

    // Job Actions State
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [appliedJobs, setAppliedJobs] = useState<Set<number>>(new Set());
    const [applyingJobs, setApplyingJobs] = useState<Set<number>>(new Set());

    // --- EFFECTS ---
    useEffect(() => {
        setIsMounted(true);
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== "candidate")) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, user, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === "candidate") {
            const loadData = async () => {
                try {
                    const [jobsData, statsData, profileData, interviewsData, testsData] = await Promise.all([
                        apiClient.getJobs(),
                        apiClient.getCandidateStats(),
                        apiClient.getProfile(),
                        apiClient.getMyInterviews(),
                        apiClient.listAssignments()
                    ]);

                    setJobs((jobsData.jobs || []).map((j: any) => ({
                        ...j,
                        skills: Array.isArray(j.skills) ? j.skills : (typeof j.skills === 'string' ? j.skills.split(',') : []),
                        postedAt: j.created_at || j.posted_at || new Date().toISOString()
                    })));
                    setStats(statsData || { total_applied: 0, profile_views: 0, resume_score: 0 });
                    if (profileData?.profile_completion) setProfileCompletion(profileData.profile_completion);
                    setScheduledInterviews(interviewsData || []);
                    setAssignedTests(testsData || []);
                } catch (e) {
                    console.error("Dashboard data load error", e);
                } finally {
                    setJobsLoading(false);
                }
            };
            loadData();
        }
    }, [isAuthenticated, user]);

    // --- HANDLERS ---
    const handleApply = async (jobId: number) => {
        if (appliedJobs.has(jobId)) return;
        setApplyingJobs(prev => new Set([...prev, jobId]));
        try {
            await apiClient.applyForJob(jobId);
            setAppliedJobs(prev => new Set([...prev, jobId]));
            // Optimistic update for stats could go here
        } catch (e) {
            console.error("Application failed", e);
        } finally {
            setApplyingJobs(prev => { const s = new Set(prev); s.delete(jobId); return s; });
        }
    };

    if (authLoading || !isMounted) return <DashboardSkeleton />;
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-screen bg-gray-50/50 dark:bg-muted/10 overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 h-full shrink-0 z-30">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="p-0 w-72 border-r border-border/50">
                    <Sidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setIsMobileMenuOpen(false) }} onLogout={logout} />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* Header */}
                <header className="h-16 shrink-0 bg-background/60 backdrop-blur-xl px-6 flex items-center justify-between z-20 border-b border-border/40">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                        <h2 className="text-lg font-semibold capitalize text-foreground/80 tracking-tight">
                            {activeTab.replace('_', ' ')}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="h-9 w-64 rounded-full bg-muted/50 border-none pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                        </div>
                        <ThemeToggle />
                        <NotificationBell />

                        <div className="h-8 w-[1px] bg-border/60 mx-1"></div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:block text-right">
                                <div className="text-sm font-semibold leading-none">{user?.full_name || "User"}</div>
                                <div className="text-[10px] text-muted-foreground mt-1">{user?.email}</div>
                            </div>
                            <Avatar className="h-9 w-9 border-2 border-white dark:border-border shadow-sm">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto pb-20">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                            >
                                {activeTab === 'overview' && (
                                    <Overview
                                        user={user}
                                        stats={stats}
                                        interviews={scheduledInterviews}
                                        tests={assignedTests}
                                        now={now || new Date()}
                                        onTabChange={(t) => setActiveTab(t as any)}
                                    />
                                )}

                                {activeTab === 'jobs' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl font-bold">Latest Opportunities</h2>
                                            <span className="text-muted-foreground text-sm">{jobs.length} jobs found</span>
                                        </div>
                                        {jobsLoading ? <div className="h-64 bg-muted animate-pulse rounded-xl" /> : (
                                            <div className="grid lg:grid-cols-2 gap-6">
                                                {jobs.map(job => (
                                                    <JobCard
                                                        key={job.id}
                                                        job={{
                                                            ...job,
                                                            postedAt: job.postedAt || job.created_at || "Recently"
                                                        }}
                                                        onApply={() => handleApply(job.id)}
                                                        onClick={() => { setSelectedJob(job); setIsModalOpen(true); }}
                                                        isApplying={applyingJobs.has(job.id)}
                                                        hasApplied={appliedJobs.has(job.id)}
                                                    />
                                                ))}
                                                {jobs.length === 0 && (
                                                    <div className="col-span-2 text-center py-20 bg-white dark:bg-card rounded-2xl border border-dashed">
                                                        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                                        <p className="text-muted-foreground">No open positions found.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'saved' && (
                                    <div className="max-w-5xl mx-auto">
                                        <SavedJobs />
                                    </div>
                                )}

                                {activeTab === 'applications' && (
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold">My Applications</h2>
                                        <ApplicationTracker />
                                    </div>
                                )}

                                {activeTab === 'resume' && (
                                    <div className="max-w-5xl mx-auto">
                                        <ResumeDoctor />
                                    </div>
                                )}

                                {activeTab === 'profile' && (
                                    <div className="max-w-4xl mx-auto">
                                        <ProfileSection onProfileUpdate={() => apiClient.getProfile().then(d => setProfileCompletion(d.profile_completion))} />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <AIChatbox />

                <JobDetailModal
                    job={selectedJob}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onApply={async (id) => { await handleApply(id); setIsModalOpen(false); }}
                    isApplying={selectedJob ? applyingJobs.has(selectedJob.id) : false}
                />

            </main>
        </div>
    );
}
