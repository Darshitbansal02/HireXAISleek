import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { Loader2, Bookmark, MapPin, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SavedJob {
    job_id: number;
    saved_at: string;
    job?: {
        title: string;
        company: string;
        location: string;
        type: string;
    };
}

export function SavedJobs() {
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSaved = async () => {
            try {
                const data = await apiClient.getSavedJobs();
                // Note: Backend currently returns job_id and saved_at. 
                // We need to fetch job details or update backend to include them.
                // For now, we will assume backend will be updated or we mock the details if missing.
                // Ideally, the backend route should join with Job table.
                if (data && data.saved_jobs) {
                    setSavedJobs(data.saved_jobs);
                } else {
                    setSavedJobs([]);
                }
            } catch (e) {
                console.error("Failed to fetch saved jobs", e);
                setSavedJobs([]);
            } finally {
                setLoading(false);
            }
        };
        fetchSaved();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (savedJobs.length === 0) {
        return (
            <Card className="border-premium">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bookmark className="h-5 w-5 text-primary" />
                        Saved Jobs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">No saved jobs yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4">
            {savedJobs.map((item) => (
                <Card key={item.job_id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex items-start justify-between">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">{item.job?.title || `Job #${item.job_id}`}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building className="h-3 w-3" />
                                <span>{item.job?.company || "Unknown Company"}</span>
                                <MapPin className="h-3 w-3 ml-2" />
                                <span>{item.job?.location || "Unknown Location"}</span>
                            </div>
                            <div className="pt-2">
                                <Badge variant="secondary">{item.job?.type || "Full-time"}</Badge>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
