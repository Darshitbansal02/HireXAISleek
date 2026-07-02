"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Building2, X, CheckCircle2, ArrowRight, CalendarDays, Share2, DollarSign, Sparkles, Globe } from "lucide-react";

export interface Job {
    id: number;
    title: string;
    company: string;
    location: string;
    description: string;
    min_experience: number;
    minExperience?: number; // CamelCase alias
    skills: string | string[]; // Support both formats
    type: string;
    created_at?: string;
    postedAt?: string; // Add postedAt
    salary?: string;
    matchScore?: number;
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

    const skillsArray = Array.isArray(job.skills)
        ? job.skills
        : (job.skills?.split(',').map(s => s.trim()).filter(Boolean) || []);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl h-[95vh] p-0 gap-0 border-none shadow-2xl bg-[#0f1115] text-white sm:rounded-3xl flex flex-col overflow-hidden outline-none">

                {/* Global Scrollbar Styles for this Component */}
                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent; 
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(255, 255, 255, 0.2);
                    }
                `}</style>

                {/* 1. Header Banner - Fixed at Top */}
                <div className="shrink-0 relative h-48 bg-gradient-to-r from-blue-950 via-[#131b2e] to-[#0f1115] flex-none z-10">
                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                    <div className="absolute top-6 right-6 z-20 flex gap-3">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 backdrop-blur-md transition-all"
                            onClick={() => { /* Share logic */ }}
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={onClose}
                            className="rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 backdrop-blur-md transition-all"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/80 to-transparent flex items-end">
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl">
                                <Building2 className="h-10 w-10 text-primary" />
                            </div>
                            <div className="mb-1">
                                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">{job.title}</h2>
                                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-slate-300">
                                    <span className="font-semibold text-white">{job.company}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 hidden md:block" />
                                    <span className="flex items-center gap-1.5 text-sm">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                        {job.location}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 hidden md:block" />
                                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-white/10">
                                        {job.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Content Area - Flex Container with Independent Scrolls */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row bg-[#0f1115] relative overflow-hidden">

                    {/* LEFT PANEL: Job Description (Scrollable) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="p-8 lg:p-10 max-w-4xl mx-auto lg:mx-0">

                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                                <div className="p-4 rounded-2xl bg-[#151921] border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-1.5">Posted</div>
                                    <div className="text-white font-medium flex items-center gap-2 text-sm">
                                        <CalendarDays className="h-4 w-4 text-blue-400" />
                                        Recent
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#151921] border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-1.5">Experience</div>
                                    <div className="text-white font-medium flex items-center gap-2 text-sm">
                                        <Briefcase className="h-4 w-4 text-purple-400" />
                                        {job.min_experience}+ Years
                                    </div>
                                </div>
                                {job.salary && (
                                    <div className="p-4 rounded-2xl bg-[#151921] border border-white/5 hover:border-white/10 transition-colors col-span-2 sm:col-span-2">
                                        <div className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-1.5">Compensation</div>
                                        <div className="text-white font-medium flex items-center gap-2 text-sm">
                                            <DollarSign className="h-4 w-4 text-green-400" />
                                            {job.salary}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-10">
                                <section>
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                        Job Description
                                        <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                    </h3>
                                    <div className="prose prose-invert max-w-none text-slate-300 text-base leading-relaxed whitespace-pre-line prose-headings:text-white prose-strong:text-white prose-strong:font-semibold">
                                        {job.description}
                                    </div>
                                </section>

                                <section className="pb-10">
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                        Skills & Requirements
                                        <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                    </h3>
                                    <div className="flex flex-wrap gap-2.5">
                                        {skillsArray.map((skill, index) => (
                                            <div
                                                key={index}
                                                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#151921] border border-white/5 text-slate-300 text-sm hover:bg-white/5 hover:border-white/10 transition-all cursor-default"
                                            >
                                                <CheckCircle2 className="h-4 w-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                                                {skill}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Sidebar Actions (Scrollable if needed, sticky feel) */}
                    <div className="w-full lg:w-[400px] bg-[#13161c] border-t lg:border-t-0 lg:border-l border-white/5 shrink-0 flex flex-col overflow-y-auto custom-scrollbar z-20 shadow-2xl">
                        <div className="p-8 space-y-8 flex-1">
                            {/* Match Score Card */}
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-8 text-white shadow-xl ring-1 ring-white/10">
                                {/* Glass Effects */}
                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-[50px] pointer-events-none" />
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-[40px] pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-md px-3 py-1">
                                            AI Analysis
                                        </Badge>
                                        <Sparkles className="h-6 w-6 text-amber-300 animate-pulse" />
                                    </div>
                                    <h4 className="text-3xl font-bold mb-2 tracking-tight">Strong Match</h4>
                                    <p className="text-blue-100/90 text-sm leading-relaxed mb-8">
                                        Your profile aligns perfectly with 85% of the requirements for this role.
                                    </p>
                                    <Button
                                        className="w-full h-12 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-base shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                        onClick={() => onApply?.(job.id)}
                                        disabled={isApplying}
                                    >
                                        {isApplying ? "Applying..." : "Quick Apply Now"}
                                    </Button>
                                </div>
                            </div>

                            {/* Company Info Widget */}
                            <div className="rounded-2xl border border-white/5 bg-[#1a1e26]/50 p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">About Company</h4>
                                    <Globe className="h-4 w-4 text-slate-500" />
                                </div>

                                <div className="space-y-4">
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        We are a forward-thinking company dedicated to innovation and excellence. We build systems that scale and matter.
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="p-3 bg-black/20 rounded-lg">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Industry</div>
                                            <div className="text-white text-xs font-medium">Technology</div>
                                        </div>
                                        <div className="p-3 bg-black/20 rounded-lg">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Size</div>
                                            <div className="text-white text-xs font-medium">50-200</div>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white h-10 text-xs">
                                    Visit Company Website
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>

            </DialogContent>
        </Dialog>
    );
}
