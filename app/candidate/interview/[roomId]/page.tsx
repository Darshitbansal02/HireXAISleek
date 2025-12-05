"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoCall } from "@/components/interview/VideoCall";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function CandidateInterviewPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [interview, setInterview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const roomId = params.roomId as string;

    useEffect(() => {
        const fetchInterview = async () => {
            try {
                const data = await apiClient.getInterviewDetails(roomId);
                setInterview(data);
            } catch (err: any) {
                console.error("Failed to fetch interview:", err);
                setError("Failed to load interview details. It may have expired or been deleted.");
            } finally {
                setLoading(false);
            }
        };

        if (roomId && user) {
            fetchInterview();
        }
    }, [roomId, user]);

    const handleLeave = () => {
        router.push("/candidate");
    };

    if (authLoading || loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black text-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Preparing interview environment...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-4">
                <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20 max-w-md text-center">
                    <h2 className="text-xl font-bold text-destructive mb-2">Unable to Join</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/candidate")}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-black">
            <VideoCall
                roomId={roomId}
                userId={user?.id?.toString() || ""}
                isInitiator={false}
                onLeave={handleLeave}
                scheduledAt={interview?.scheduled_at}
                participantName={interview?.recruiter?.full_name || "Recruiter"}
            />
        </div>
    );
}
