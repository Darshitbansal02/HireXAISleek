import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye, Loader2, MapPin, Clock, Users as UsersIcon, FileText, X, AlertCircle, User, Briefcase, GraduationCap, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { JobCard } from "@/components/JobCard";

// 1. FIXED INTERFACE: Added missing props for delete and update actions
interface MyJobsSectionProps {
    jobs: any[];
    loading: boolean;
    selectedJobId: number | null;
    applications: any[];
    applicationsLoading: boolean;
    onViewApplications: (jobId: number) => void;

    // Added these lines to fix the TypeScript error
    onDeleteJob: (jobId: number) => void;
    isDeleting: boolean;
    onUpdateStatus: (applicationId: number, status: string) => void;
    isUpdating: boolean;
    onViewProfile: (candidateId: number) => void;
}

export function MyJobsSection({
    jobs,
    loading,
    selectedJobId,
    applications,
    applicationsLoading,
    onViewApplications,
    // Destructure the new props
    onDeleteJob,
    isDeleting,
    onUpdateStatus,
    isUpdating,
    onViewProfile
}: MyJobsSectionProps) {
    const [viewResumeContent, setViewResumeContent] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <Card className="border-premium">
                <CardContent className="flex flex-col items-center justify-center p-12">
                    <p className="text-muted-foreground text-center">
                        No jobs posted yet. Create your first job posting from the "Post Job" tab!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Jobs List */}
                <Card className="border-premium">
                    <CardHeader>
                        <CardTitle>My Posted Jobs ({jobs.length})</CardTitle>
                        <CardDescription>Manage your job postings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {jobs.map((job) => (
                            <div key={job.id} className={selectedJobId === job.id ? 'ring-2 ring-primary rounded-xl' : ''}>
                                <JobCard
                                    job={{
                                        id: job.id,
                                        title: job.title,
                                        company: job.company || "Hiring Company",
                                        location: job.location,
                                        type: job.type,
                                        postedAt: new Date(job.created_at).toLocaleDateString(), // Assuming created_at exists
                                        skills: job.skills ? (Array.isArray(job.skills) ? job.skills : job.skills.split(',')) : [],
                                        minExperience: job.min_experience
                                    }}
                                    onClick={() => onViewApplications(job.id)}
                                    footer={
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                variant={selectedJobId === job.id ? "secondary" : "outline"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewApplications(job.id);
                                                }}
                                                className="flex-1"
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                {selectedJobId === job.id ? "Hide Applicants" : "View Applicants"}
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteJob(job.id);
                                                }}
                                                disabled={isDeleting}
                                                title="Delete Job Posting"
                                            >
                                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    }
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Applications List Panel */}
                <Card className="border-premium h-fit sticky top-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UsersIcon className="h-5 w-5" />
                            Applications
                        </CardTitle>
                        <CardDescription>
                            {selectedJobId
                                ? `${applications.length} candidate${applications.length !== 1 ? 's' : ''} applied`
                                : "Select a job to view applications"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!selectedJobId ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <UsersIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">
                                    Select a job from the left to view its applications
                                </p>
                            </div>
                        ) : applicationsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <UsersIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground font-medium mb-1">
                                    No applications yet
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Candidates will appear here when they apply
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {applications.map((app) => {
                                    // Color logic for badges based on status
                                    const statusColor: { [key: string]: string } = {
                                        'applied': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
                                        'pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
                                        'reviewed': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
                                        'shortlisted': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200',
                                        'interviewing': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200',
                                        'rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200',
                                        'hired': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
                                    };
                                    const colorClass = statusColor[app.status?.toLowerCase() || ''] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200';

                                    return (
                                        <Card key={app.id} className="border-premium hover:shadow-md transition-shadow">
                                            <CardContent className="p-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    {/* Candidate Info */}
                                                    <div className="flex-1 space-y-3">
                                                        <div>
                                                            <button
                                                                onClick={() => onViewProfile ? onViewProfile(app.candidate_id) : console.warn("onViewProfile missing")}
                                                                className="font-semibold text-lg hover:text-primary hover:underline text-left transition-colors flex items-center gap-2"
                                                            >
                                                                {app.candidate?.full_name || 'Anonymous Candidate'}
                                                                <Eye className="h-3 w-3 opacity-50" />
                                                            </button>
                                                            {app.candidate?.email && (
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {app.candidate.email}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Status Badge & Update Dropdown */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${colorClass} capitalize font-medium border`}
                                                            >
                                                                {app.status || 'Pending'}
                                                            </Badge>

                                                            {/* STATUS SELECTOR */}
                                                            <select
                                                                className="h-6 text-xs rounded border border-input bg-background px-1 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                                                value={app.status || 'pending'}
                                                                onChange={(e) => onUpdateStatus(app.id, e.target.value)}
                                                                disabled={isUpdating}
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="reviewed">Reviewed</option>
                                                                <option value="shortlisted">Shortlisted</option>
                                                                <option value="interview">Interview</option>
                                                                <option value="offer">Offer</option>
                                                                <option value="hired">Hired</option>
                                                                <option value="rejected">Rejected</option>
                                                            </select>

                                                            <span className="text-xs text-muted-foreground ml-auto">
                                                                Applied {new Date(app.applied_at).toLocaleDateString()}
                                                            </span>
                                                        </div>

                                                        {/* Cover Letter Preview */}
                                                        {app.cover_letter && (
                                                            <div className="pt-2 border-t border-border/50">
                                                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                                                    Cover Letter:
                                                                </p>
                                                                <p className="text-sm text-foreground/80 line-clamp-2 italic">
                                                                    "{app.cover_letter}"
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Resume Button Logic */}
                                                        {(app.resume_content || app.resume_url) && (
                                                            <div className="pt-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="gap-2 h-8 w-full sm:w-auto"
                                                                    onClick={() => {
                                                                        if (app.resume_content) {
                                                                            setViewResumeContent(app.resume_content);
                                                                        } else {
                                                                            window.open(app.resume_url, '_blank');
                                                                        }
                                                                    }}
                                                                >
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    {app.resume_content ? "View Resume Content" : "Download Resume PDF"}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Application ID Badge */}
                                                    <div className="text-right hidden sm:block">
                                                        <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                                            #{app.id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Resume Viewer Modal */}
            <Dialog open={!!viewResumeContent} onOpenChange={() => setViewResumeContent(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Candidate Resume</DialogTitle>
                        <DialogDescription>
                            Review the candidate's resume details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 p-6 bg-muted/30 rounded-lg border border-border whitespace-pre-wrap font-mono text-sm shadow-inner">
                        {viewResumeContent}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
