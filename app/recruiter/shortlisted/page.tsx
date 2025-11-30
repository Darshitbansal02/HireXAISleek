"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { Loader2, BookmarkX, Calendar, FileText, Trash2 } from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateProfileModal } from "@/components/CandidateProfileModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { useToast } from "@/components/ui/use-toast";

export default function ShortlistedCandidatesPage() {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
    const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchShortlisted();
    }, []);

    const fetchShortlisted = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getShortlistedCandidates();
            setCandidates(data);
        } catch (error) {
            console.error("Failed to fetch shortlisted candidates", error);
            toast({
                title: "Error",
                description: "Failed to load shortlisted candidates.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (candidateId: number) => {
        try {
            await apiClient.removeShortlist(candidateId);
            setCandidates(prev => prev.filter(c => c.candidate_id !== candidateId));
            toast({
                title: "Removed",
                description: "Candidate removed from shortlist.",
            });
        } catch (error) {
            console.error("Remove error:", error);
            toast({
                title: "Error",
                description: "Failed to remove candidate.",
                variant: "destructive",
            });
        }
    };

    const handleViewProfile = (candidateId: number) => {
        setSelectedCandidateId(candidateId);
        setIsProfileModalOpen(true);
    };

    const handleSchedule = (candidateId: number, jobId?: number) => {
        setSelectedCandidateId(candidateId);
        setSelectedJobId(jobId);
        setIsScheduleModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shortlisted Candidates</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your shortlisted candidates for potential interviews.
                    </p>
                </div>
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-medium">
                    {candidates.length} Candidates
                </div>
            </div>

            {candidates.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <BookmarkX className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No shortlisted candidates yet</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Start searching for candidates and click the shortlist button to save them here.
                        </p>
                        <Button variant="outline" onClick={() => window.location.href = '/recruiter'}>
                            Go to Search
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {candidates.map((item) => (
                        <div key={item.id} className="relative group">
                            <CandidateCard
                                candidate={{
                                    id: item.candidate_id,
                                    full_name: item.candidate?.full_name || "Unknown Candidate",
                                    headline: item.candidate?.headline || "No Headline",
                                    location: item.candidate?.location || "Unknown",
                                    experience_years: item.candidate?.experience_years || 0,
                                    skills: item.candidate?.skills || [],
                                    similarity: undefined, // Not relevant here
                                    avatar_url: item.candidate?.avatar_url
                                }}
                                onViewProfile={handleViewProfile}
                                actions={
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleSchedule(item.candidate_id, item.job_id)}
                                        >
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Schedule
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="px-3"
                                            onClick={() => handleRemove(item.candidate_id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                }
                            />

                            {/* Additional Info Footer */}
                            <div className="mt-2 px-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                                {item.job_id && (
                                    <span className="bg-muted px-2 py-1 rounded">
                                        Linked to Job #{item.job_id}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CandidateProfileModal
                candidateId={selectedCandidateId}
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            <ScheduleModal
                candidateId={selectedCandidateId}
                jobId={selectedJobId}
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
            />
        </div>
    );
}
