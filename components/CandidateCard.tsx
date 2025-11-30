import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Briefcase, Eye } from "lucide-react";
import { ShortlistButton } from "./ShortlistButton";

interface CandidateCardProps {
    candidate: {
        id: number;
        full_name: string;
        headline?: string;
        location?: string;
        skills?: string[] | string;
        experience_years?: number;
        similarity?: number;
        avatar_url?: string;
    };
    onViewProfile: (id: number) => void;
    jobId?: number;
    actions?: React.ReactNode;
}

export function CandidateCard({ candidate, onViewProfile, jobId, actions }: CandidateCardProps) {
    // Helper to parse skills safely
    const skillsList = Array.isArray(candidate.skills)
        ? candidate.skills
        : typeof candidate.skills === 'string'
            ? candidate.skills.split(',').map(s => s.trim())
            : [];

    return (
        <Card className="hover:shadow-lg transition-shadow border-premium">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                        <Avatar className="h-12 w-12 border-2 border-primary/10">
                            <AvatarImage src={candidate.avatar_url} />
                            <AvatarFallback className="bg-primary/5 text-primary font-medium">
                                {candidate.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg font-semibold text-foreground hover:text-primary cursor-pointer" onClick={() => onViewProfile(candidate.id)}>
                                {candidate.full_name}
                            </CardTitle>
                            {candidate.headline && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                    {candidate.headline}
                                </p>
                            )}
                        </div>
                    </div>
                    {candidate.similarity !== undefined && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200">
                            {Math.round(candidate.similarity * 100)}% Match
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {/* Location & Experience */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {candidate.location && (
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {candidate.location}
                        </div>
                    )}
                    {candidate.experience_years !== undefined && (
                        <div className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {candidate.experience_years} years exp
                        </div>
                    )}
                </div>

                {/* Skills */}
                {skillsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {skillsList.slice(0, 4).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-muted/50">
                                {skill}
                            </Badge>
                        ))}
                        {skillsList.length > 4 && (
                            <span className="text-xs text-muted-foreground self-center pl-1">
                                +{skillsList.length - 4} more
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-2 gap-2">
                {actions ? actions : (
                    <>
                        <ShortlistButton
                            candidateId={candidate.id}
                            jobId={jobId}
                            className="flex-1"
                        />
                        <Button
                            className="flex-1 gap-2"
                            variant="default"
                            onClick={() => onViewProfile(candidate.id)}
                        >
                            <Eye className="h-4 w-4" />
                            View Profile
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}
