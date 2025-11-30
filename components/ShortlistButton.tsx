import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";

interface ShortlistButtonProps {
    candidateId: number;
    jobId?: number;
    initialShortlisted?: boolean;
    onToggle?: (isShortlisted: boolean) => void;
    className?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
}

export function ShortlistButton({
    candidateId,
    jobId,
    initialShortlisted = false,
    onToggle,
    className,
    variant = "outline",
    size = "sm"
}: ShortlistButtonProps) {
    const [isShortlisted, setIsShortlisted] = useState(initialShortlisted);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLoading(true);
        try {
            if (isShortlisted) {
                await apiClient.removeShortlist(candidateId);
                setIsShortlisted(false);
                toast({
                    title: "Removed from shortlist",
                    description: "Candidate has been removed from your shortlist.",
                });
            } else {
                await apiClient.shortlistCandidate(candidateId, jobId);
                setIsShortlisted(true);
                toast({
                    title: "Shortlisted!",
                    description: "Candidate has been added to your shortlist.",
                });
            }
            if (onToggle) {
                onToggle(!isShortlisted);
            }
        } catch (error: any) {
            console.error("Shortlist error:", error);
            const errorMessage = error.response?.data?.detail || error.message || "Failed to update shortlist status.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleToggle}
            disabled={loading}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isShortlisted ? (
                <>
                    <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                    Shortlisted
                </>
            ) : (
                <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Shortlist
                </>
            )}
        </Button>
    );
}
