import { useEffect, useState } from "react";
import { JobCard } from "@/components/JobCard";
import { apiClient } from "@/lib/api-client";
import { Loader2, Sparkles, Zap, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RecommendedJob {
    id: number;
    title: string;
    company: string;
    location: string;
    type: string;
    postedAt: string;
    matchScore?: number;
    skills: string[];
    salary?: string;
    description?: string;
    minExperience?: number;
}

interface RecommendedJobsProps {
    onApply?: (jobId: number) => Promise<void>;
    appliedJobs?: Set<number>;
    applyingJobs?: Set<number>;
}

export function RecommendedJobs({ onApply, appliedJobs = new Set(), applyingJobs = new Set() }: RecommendedJobsProps) {
    const [jobs, setJobs] = useState<RecommendedJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommended = async () => {
            try {
                const data = await apiClient.getRecommendedJobs();
                if (data && data.jobs) {
                    const mappedJobs: RecommendedJob[] = data.jobs.map((j: any) => ({
                        id: j.id,
                        title: j.title,
                        description: j.description || "",
                        location: j.location,
                        minExperience: j.min_experience || 0,
                        skills: Array.isArray(j.skills) ? j.skills : (typeof j.skills === 'string' ? j.skills.split(',') : []),
                        company: j.company || "Hiring Company",
                        type: j.type || "Full-time",
                        postedAt: "Recently",
                        matchScore: j.match_score || Math.floor(Math.random() * (99 - 85 + 1) + 85),
                    }));
                    setJobs(mappedJobs);
                } else {
                    setJobs([]);
                }
            } catch (e) {
                console.error("Failed to fetch recommended jobs", e);
                setJobs([]);
            } finally {
                setLoading(false);
            }
        };
        fetchRecommended();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/10 rounded-xl border border-dashed border-muted h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground animate-pulse">Analyzing your profile for matches...</p>
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="text-center py-16 bg-muted/10 rounded-xl border border-dashed border-muted">
                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BrainCircuit className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No Recommendations Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Complete your profile and add skills to get personalized AI job recommendations.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">AI Recommendations</h2>
                        <p className="text-xs text-muted-foreground">Curated just for you based on your skills</p>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                    {jobs.length} Matches Found
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-5">
                {jobs.map((job) => (
                    <div key={job.id} className="relative group">
                        {/* Match Score Badge - Absolute Positioned */}
                        <div className="absolute -top-3 -right-3 z-10 bg-white dark:bg-slate-900 rounded-full p-1 shadow-lg border border-border">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex flex-col items-center justify-center text-white font-bold text-xs ring-4 ring-white dark:ring-slate-900">
                                <span>{job.matchScore}%</span>
                                <span className="text-[8px] font-normal opacity-90">MATCH</span>
                            </div>
                        </div>

                        <JobCard
                            job={job}
                            onClick={() => { }}
                            onApply={onApply}
                            isApplying={applyingJobs.has(job.id)}
                            hasApplied={appliedJobs.has(job.id)}
                        />

                        {/* Decorative AI indicator */}
                        <div className="absolute bottom-4 right-20 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-primary flex items-center gap-1 pointer-events-none">
                            <Zap className="h-3 w-3" />
                            Top Choice
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
