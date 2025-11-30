import { useEffect, useState } from "react";
import { JobCard } from "@/components/JobCard";
import { apiClient } from "@/lib/api-client";
import { Loader2, Sparkles } from "lucide-react";

// Define interface matching JobCard requirements
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
                        matchScore: 95, // Mock score for now, or get from backend if available
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
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">Complete your profile to get smart recommendations!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">AI Recommended for You</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {jobs.map((job) => (
                    <JobCard
                        key={job.id}
                        job={job}
                        onClick={() => { }} // Handle click
                        onApply={onApply}
                        isApplying={applyingJobs.has(job.id)}
                        hasApplied={appliedJobs.has(job.id)}
                    />
                ))}
            </div>
        </div>
    );
}
