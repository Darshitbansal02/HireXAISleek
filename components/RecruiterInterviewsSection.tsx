"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, User, Briefcase, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { parseUTCTime } from "@/lib/utils";

interface Interview {
    id: number;
    room_id: string;
    candidate_id: number;
    job_id: number | null;
    scheduled_at: string;
    status: string;
    candidate?: {
        full_name: string;
        email: string;
    };
    job?: {
        title: string;
    };
}

export function RecruiterInterviewsSection() {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const data = await apiClient.getMyInterviews();
            setInterviews(data || []);
        } catch (err) {
            console.error("Failed to fetch interviews", err);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = (roomId: string) => {
        router.push(`/recruiter/interview/${roomId}`);
    };

    if (loading) {
        return <div className="text-center py-8">Loading interviews...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Scheduled Interviews</h3>
                <Button variant="outline" size="sm" onClick={fetchInterviews} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {interviews.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No interviews scheduled yet.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {interviews.map((interview) => (
                        <Card key={interview.id} className="hover:border-primary/50 transition-colors">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-lg">
                                            {interview.candidate?.full_name
                                                ? `Interview with ${interview.candidate.full_name}`
                                                : `Interview with Candidate #${interview.candidate_id}`}
                                        </h4>
                                        <Badge variant={interview.status === 'scheduled' ? 'default' : 'secondary'}>
                                            {interview.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {parseUTCTime(interview.scheduled_at)?.toLocaleDateString(undefined, {
                                                weekday: 'short',
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {parseUTCTime(interview.scheduled_at)?.toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZoneName: 'short'
                                            })}
                                        </div>
                                        {interview.job_id && (
                                            <div className="flex items-center gap-1">
                                                <Briefcase className="h-4 w-4" />
                                                {interview.job?.title
                                                    ? interview.job.title
                                                    : `Job #${interview.job_id}`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button onClick={() => handleJoin(interview.room_id)} className="gap-2">
                                    <Video className="h-4 w-4" />
                                    Join Meeting
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
