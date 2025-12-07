"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api-client";
import { Loader, MapPin, Mail, Phone, Linkedin, Globe, Download, Briefcase, GraduationCap, Star, FileText, User as UserIcon } from "lucide-react";
import { ShortlistButton } from "./ShortlistButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExperienceList } from "./profile/ExperienceList";
import { EducationList } from "./profile/EducationList";
import { SkillsList } from "./profile/SkillsList";

interface CandidateProfileModalProps {
    candidateId: number | null;
    isOpen: boolean;
    onClose: () => void;
    similarityScore?: number;
    jobId?: number; // Add optional jobId prop
}

export function CandidateProfileModal({ candidateId, isOpen, onClose, similarityScore, jobId }: CandidateProfileModalProps) {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (isOpen && candidateId) {
            fetchProfile(candidateId);
        } else {
            setProfile(null);
        }
    }, [isOpen, candidateId]);

    const fetchProfile = async (id: number) => {
        setLoading(true);
        setError("");
        try {
            const data = await apiClient.getCandidateDetails(id);
            setProfile(data);
        } catch (err: any) {
            console.error("Failed to fetch candidate details", {
                err,
                message: err?.message,
                response: err?.response?.data,
                status: err?.response?.status,
                candidateId: id
            });
            const errorMessage = err?.response?.data?.detail || err?.message || "Failed to load candidate profile.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadResume = async () => {
        if (!candidateId) return;

        setDownloading(true);
        try {
            const blob = await apiClient.fetchRecruiterResumeBlob(candidateId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Try to get filename from profile or default
            const filename = profile?.resume_preview || `resume_${candidateId}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download resume", err);
            // Fallback to opening in new tab if blob fails (though likely to fail auth too, but worth a try or alert)
            alert("Failed to download resume. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const handleViewResume = async () => {
        if (!candidateId) return;

        setDownloading(true);
        try {
            const blob = await apiClient.fetchRecruiterResumeBlob(candidateId);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Note: We can't easily revoke the URL here if we open it in a new tab, 
            // but browsers usually handle blob URL cleanup eventually. 
            // Ideally, we'd use an iframe or a dedicated viewer route.
        } catch (err) {
            console.error("Failed to view resume", err);
            alert("Failed to open resume.");
        } finally {
            setDownloading(false);
        }
    };

    if (!isOpen) return null;

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {/* Fixed height h-[85vh] ensures the modal has a definite size for scrolling */}
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                {/* Header Section */}
                <div className="p-6 pb-6 border-b bg-muted/20 shrink-0">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex gap-5 items-start">
                                <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                                    <AvatarImage src={profile?.avatar_url} />
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                                        {profile?.full_name ? getInitials(profile.full_name) : <UserIcon className="h-8 w-8" />}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="space-y-1.5">
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                        {loading ? "Loading..." : profile?.full_name || "Candidate Profile"}
                                        {similarityScore && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                                {Math.round(similarityScore * 100)}% Match
                                            </Badge>
                                        )}
                                    </DialogTitle>
                                    <DialogDescription className="text-base font-medium text-foreground/80">
                                        {profile?.headline || "No headline provided"}
                                    </DialogDescription>

                                    {!loading && profile && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1">
                                            {profile.location && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {profile.location}
                                                </div>
                                            )}
                                            {profile.email && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {profile.email}
                                                </div>
                                            )}
                                            {profile.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {profile.phone}
                                                </div>
                                            )}
                                            {profile.linkedin_url && (
                                                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline transition-colors">
                                                    <Linkedin className="h-3.5 w-3.5" />
                                                    LinkedIn
                                                </a>
                                            )}
                                            {profile.portfolio_url && (
                                                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline transition-colors">
                                                    <Globe className="h-3.5 w-3.5" />
                                                    Portfolio
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {profile?.resume_url && (
                                    <Button variant="outline" onClick={handleDownloadResume} disabled={downloading} className="shadow-sm">
                                        {downloading ? (
                                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4 mr-2" />
                                        )}
                                        Download PDF
                                    </Button>
                                )}
                                {profile && candidateId && (
                                    <ShortlistButton
                                        candidateId={candidateId}
                                        jobId={jobId}
                                        className="ml-2 shadow-sm"
                                    />
                                )}
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <ScrollArea className="flex-1 h-full w-full">
                    <div className="p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-muted-foreground">Loading profile details...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-20 text-red-500 bg-red-50/50 rounded-lg border border-red-100 mx-8">
                                <p className="mb-4 font-medium">{error}</p>
                                <Button variant="outline" onClick={() => candidateId && fetchProfile(candidateId)}>
                                    Retry
                                </Button>
                            </div>
                        ) : profile ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Main Content */}
                                <div className="lg:col-span-2 space-y-8">

                                    {/* Bio */}
                                    {profile.bio && (
                                        <section className="space-y-3">
                                            <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                                                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                About
                                            </h3>
                                            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
                                                {profile.bio}
                                            </p>
                                        </section>
                                    )}

                                    <Separator />

                                    {/* Experience */}
                                    <section className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                                            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                            Experience
                                        </h3>
                                        <ExperienceList
                                            experiences={profile.experience}
                                            variant="timeline"
                                        />
                                    </section>

                                    <Separator />

                                    {/* Education */}
                                    <section className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                                            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                <GraduationCap className="h-4 w-4" />
                                            </div>
                                            Education
                                        </h3>
                                        <EducationList
                                            education={profile.education}
                                            variant="view"
                                        />
                                    </section>
                                </div>

                                {/* Right Column: Sidebar */}
                                <div className="space-y-8">
                                    {/* Resume Score Card */}
                                    {profile.resume_score !== undefined && profile.resume_score !== null && (
                                        <div className="p-5 rounded-xl border bg-card shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">ATS Score</h3>
                                                <Badge variant={profile.resume_score >= 80 ? "default" : profile.resume_score >= 60 ? "secondary" : "destructive"}>
                                                    {profile.resume_score >= 80 ? "Excellent" : profile.resume_score >= 60 ? "Good" : "Needs Work"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-end gap-2 mb-2">
                                                <span className={`text-4xl font-bold ${profile.resume_score >= 80 ? 'text-green-600' :
                                                    profile.resume_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                    {profile.resume_score}
                                                </span>
                                                <span className="text-muted-foreground mb-1">/ 100</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${profile.resume_score >= 80 ? 'bg-green-500' :
                                                        profile.resume_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${profile.resume_score}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Skills */}
                                    <section className="space-y-3">
                                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                                            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                <Star className="h-4 w-4" />
                                            </div>
                                            Skills
                                        </h3>
                                        <SkillsList
                                            skills={profile.skills}
                                            variant="view"
                                        />
                                    </section>

                                    {/* Resume Preview Thumbnail (Optional) */}
                                    {profile.resume_url && (
                                        <section className="space-y-3">
                                            <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                                                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                Resume
                                            </h3>
                                            <div className="border rounded-lg p-4 bg-muted/10 flex flex-col items-center justify-center text-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer group" onClick={handleViewResume}>
                                                <div className="h-16 w-16 rounded-full bg-background border flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FileText className="h-8 w-8 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">View Resume PDF</p>
                                                    <p className="text-xs text-muted-foreground">Click to open</p>
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-muted-foreground">
                                Candidate profile not found.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
