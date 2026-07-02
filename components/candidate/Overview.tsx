"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp, Sparkles, Video, Calendar, Clock, ArrowRight, Zap, Target, History } from "lucide-react";
import { DailyAIInsight } from "@/components/DailyAIInsight";
import { AssessmentCard } from "./AssessmentCard";
import { InterviewCard } from "./InterviewCard";
import { useRouter } from "next/navigation";

interface OverviewProps {
    user: any;
    stats: any;
    interviews: any[];
    tests: any[];
    now: Date;
    onTabChange: (tab: string) => void;
}

export function Overview({ user, stats, interviews, tests, now, onTabChange }: OverviewProps) {
    const router = useRouter();

    const activeTests = tests.filter(t => t.status !== 'completed' || (t.expires_at && new Date(t.expires_at) > now));
    const completedTests = tests.filter(t => t.status === 'completed');
    const upcomingInterviews = interviews.filter(i => i.status !== 'completed');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">

            {/* SECTION 1: HEADER & STATS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* 1. Welcome Banner (RESTORED STYLE) */}
                <div className="xl:col-span-8 relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-700 p-8 shadow-xl shadow-blue-500/10 text-white flex items-center justify-between group">
                    <div className="relative z-10 flex-1">
                        <h2 className="text-3xl font-bold mb-2 tracking-tight">Welcome back, {user?.full_name?.split(' ')[0] || "Candidate"}!</h2>
                        <p className="text-blue-100 text-lg mb-8 max-w-lg leading-relaxed">
                            You have <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-md">{upcomingInterviews.length} upcoming interview{upcomingInterviews.length !== 1 ? 's' : ''}</span> and <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-md">{activeTests.length} pending assessment{activeTests.length !== 1 ? 's' : ''}</span>.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => onTabChange("jobs")}
                                size="lg"
                                className="bg-white text-blue-700 hover:bg-blue-50 font-bold border-none rounded-xl h-11 px-6 shadow-md transition-transform hover:scale-105"
                            >
                                Browse Jobs
                            </Button>
                            <Button
                                onClick={() => router.push("/candidate/builder")}
                                size="lg"
                                variant="outline"
                                className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm rounded-xl h-11 px-6 font-medium transition-transform hover:scale-105"
                            >
                                Resume Builder
                            </Button>
                        </div>
                    </div>
                    {/* Decorative Icons (Briefcase) */}
                    <div className="hidden md:block absolute right-0 top-0 bottom-0 w-64 pointer-events-none">
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 transform group-hover:scale-110 transition-transform duration-700">
                            <Briefcase className="h-40 w-40 rotate-12" />
                        </div>
                    </div>
                    {/* Soft Glows for depth */}
                    <div className="absolute -right-20 -top-20 h-64 w-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -left-20 -bottom-20 h-64 w-64 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                {/* Vertical Stats Column (Spans 4/12) */}
                <div className="xl:col-span-4 flex flex-col gap-4">
                    {/* Applied */}
                    <div className="flex-1 bg-white dark:bg-card p-6 rounded-[2rem] border border-border/40 hover:border-blue-500/20 shadow-sm hover:shadow-lg transition-all group flex items-center justify-between">
                        <div>
                            <p className="text-4xl font-bold text-foreground mb-1">{stats.total_applied || 0}</p>
                            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-2">
                                <Briefcase className="h-4 w-4" /> Applications
                            </p>
                        </div>
                        <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-inner">
                            <Briefcase className="h-8 w-8" />
                        </div>
                    </div>

                    {/* Views */}
                    <div className="flex-1 bg-white dark:bg-card p-6 rounded-[2rem] border border-border/40 hover:border-emerald-500/20 shadow-sm hover:shadow-lg transition-all group flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <p className="text-4xl font-bold text-foreground">{stats.profile_views || 0}</p>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 h-6">+12%</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> Profile Views
                            </p>
                        </div>
                        <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-inner">
                            <TrendingUp className="h-8 w-8" />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: WIDGET ROW (Insight | Interview | ATS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-full">

                {/* 1. Daily Insight (Left - Wide) -> Spans 5 */}
                <div className="lg:col-span-5 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400 fill-current" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Daily Insight</h3>
                    </div>
                    {/* Clean look with fit content height */}
                    <div className="relative group">
                        <div className="bg-transparent rounded-[2rem] overflow-visible">
                            <DailyAIInsight />
                        </div>
                    </div>
                </div>

                {/* 2. Interviews (Middle) -> Spans 4 */}
                <div className="lg:col-span-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <Video className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Next Interview</h3>
                        </div>
                    </div>

                    <div className="flex-1">
                        {upcomingInterviews.length === 0 ? (
                            <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center bg-white dark:bg-card rounded-[2rem] border border-border/50 border-dashed p-8">
                                <div className="h-12 w-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                                    <Calendar className="h-6 w-6 text-muted-foreground/60" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">You have no interviews scheduled.</p>
                                <Button variant="link" className="text-primary text-xs mt-1">Check Calendar</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingInterviews.slice(0, 2).map((interview) => (
                                    <InterviewCard key={interview.id} interview={interview} now={now} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. ATS Score (Right) -> Spans 3 */}
                <div className="lg:col-span-3 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Resume Health</h3>
                        </div>
                    </div>

                    <div className="h-full min-h-[180px] bg-[#0f172a] dark:bg-black rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl shadow-blue-900/10 group flex flex-col justify-between hover:shadow-2xl transition-shadow">
                        {/* Top */}
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-5xl font-bold tracking-tighter">{stats.resume_score || 0}</span>
                                <span className="text-lg text-white/50 font-medium">/100</span>
                            </div>
                            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                                <Target className="h-5 w-5 text-blue-300" />
                            </div>
                        </div>

                        {/* Bar */}
                        <div className="relative z-10 w-full bg-white/10 h-2 rounded-full overflow-hidden my-4">
                            <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${stats.resume_score || 0}%` }} />
                        </div>

                        {/* Bottom */}
                        <div className="relative z-10">
                            <p className="text-xs text-blue-200/80 mb-4 font-medium leading-relaxed">
                                {stats.resume_score > 80 ? "Your profile is top-tier! Keep it up." : "Boost your visibility by improving your score."}
                            </p>
                            <Button
                                onClick={() => onTabChange("resume")}
                                variant="secondary"
                                className="w-full bg-white hover:bg-blue-50 text-slate-900 font-bold rounded-xl shadow-lg"
                            >
                                Improve Now
                            </Button>
                        </div>

                        {/* Decor */}
                        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity" />
                        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500 rounded-full blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity" />
                    </div>
                </div>
            </div>

            {/* SECTION 3: ASSESSMENTS (Bottom - Full Width) */}
            <div className="pt-6 border-t border-border/30">
                <div className="flex items-center justify-between mb-6 px-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                            <Target className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">Assessments</h3>
                        <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-bold px-3 py-1">
                            {tests.filter(t => t.status !== 'completed').length} Pending
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {activeTests.length === 0 ? (
                        <div className="col-span-1 xl:col-span-2 p-12 text-center bg-white dark:bg-card rounded-[2rem] border border-dashed border-border/60">
                            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <h4 className="font-semibold text-lg text-foreground">No Pending Assessments</h4>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Great job! You have completed all your assigned assessments. Check back later for new tasks.</p>
                        </div>
                    ) : (
                        activeTests.map(test => (
                            <AssessmentCard key={test.id} test={test} now={now} />
                        ))
                    )}
                </div>

                {/* PAST ASSESSMENTS SECTION */}
                {completedTests.length > 0 && (
                    <div className="mt-12">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2 pl-1">
                            <History className="h-4 w-4" /> Past Assessments
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedTests.slice(0, 3).map(test => (
                                <div key={test.id} className="opacity-80 hover:opacity-100 transition-opacity">
                                    <AssessmentCard test={test} now={now} />
                                </div>
                            ))}
                        </div>
                        {completedTests.length > 3 && (
                            <div className="mt-6 text-center">
                                <Button variant="outline" className="rounded-full px-8">View All History</Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
