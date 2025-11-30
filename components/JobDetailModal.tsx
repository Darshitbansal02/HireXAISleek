"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Clock, DollarSign, Building2, X } from "lucide-react";

export interface Job {
    id: number;
    title: string;
    company: string;
    location: string;
    description: string;
    min_experience: number;
    skills: string;
    type: string;
    created_at?: string;
}

interface JobDetailModalProps {
    job: Job | null;
    isOpen: boolean;
    onClose: () => void;
    onApply?: (jobId: number) => void;
    isApplying?: boolean;
}

export function JobDetailModal({ job, isOpen, onClose, onApply, isApplying = false }: JobDetailModalProps) {
    if (!job) return null;

    const skillsArray = job.skills?.split(',').map(s => s.trim()).filter(Boolean) || [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl font-bold mb-2">{job.title}</DialogTitle>
                            <DialogDescription className="flex items-center gap-4 text-base">
                                <span className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {job.company}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {job.location}
                                </span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Job Meta Information */}
                    <div className="flex flex-wrap gap-3">
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {job.type}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {job.min_experience}+ years
                        </Badge>
                    </div>

                    {/* Skills */}
                    {skillsArray.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Required Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {skillsArray.map((skill, index) => (
                                    <Badge key={index} variant="outline" className="bg-primary/5">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Job Description */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Job Description</h3>
                        <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                            {job.description}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            className="flex-1"
                            size="lg"
                            onClick={() => onApply?.(job.id)}
                            disabled={isApplying}
                        >
                            {isApplying ? "Applying..." : "Apply for this Position"}
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={onClose}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
