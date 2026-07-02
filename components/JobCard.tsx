"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, Clock, Sparkles, TrendingUp, Building2, ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    type: string;
    postedAt: string;
    matchScore?: number;
    skills: string | string[];
    salary?: string;
    description?: string;
    minExperience?: number;
  };
  onApply?: (jobId: number) => Promise<void>;
  onClick?: () => void;
  isApplying?: boolean;
  hasApplied?: boolean;
  footer?: React.ReactNode;
}

export function JobCard({ job, onApply, onClick, isApplying = false, hasApplied = false, footer }: JobCardProps) {
  const skillsArray = Array.isArray(job.skills) ? job.skills : (job.skills?.split(',').map(s => s.trim()).filter(Boolean) || []);

  const handleApplyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApply) {
      await onApply(job.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={cn(onClick ? "cursor-pointer" : "", "h-full")}
    >
      <div className="group relative h-full bg-white dark:bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/10 shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden isolate">

        {/* Animated Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

        {/* Top Decorative Blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />

        <div className="p-6 md:p-8 flex flex-col h-full relative z-10">

          {/* Header Area */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-white/50 shadow-inner flex items-center justify-center group-hover:rotate-3 transition-transform duration-300">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                {job.matchScore && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-primary to-blue-600 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-md border border-white/20">
                    {job.matchScore}%
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-300">
                  {job.title}
                </h3>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                  {job.company}
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs opacity-70">Top Rated</span>
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-muted-foreground -mr-2"
            >
              <Star className="h-5 w-5" />
            </Button>
          </div>

          {/* Tags - Glassmorphic Pills */}
          <div className="flex flex-wrap gap-2.5 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/10 backdrop-blur-sm">
              <Briefcase className="h-3.5 w-3.5" />
              {job.type}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/50 text-secondary-foreground border border-white/10 backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
            {job.salary && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10 backdrop-blur-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                {job.salary}
              </span>
            )}
          </div>

          {/* Skills - Tiny Dots visualization */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest text-[10px]">Skills</span>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex flex-wrap gap-2 mb-auto">
            {skillsArray.slice(0, 3).map(skill => (
              <Badge key={skill} variant="outline" className="text-xs font-normal border-white/20 bg-white/40 dark:bg-black/20 backdrop-blur-md hover:bg-primary/5 hover:border-primary/20 transition-colors">
                {skill}
              </Badge>
            ))}
            {skillsArray.length > 3 && (
              <span className="text-[10px] flex items-center justify-center h-5 px-1.5 rounded-full bg-muted text-muted-foreground font-medium">
                +{skillsArray.length - 3}
              </span>
            )}
          </div>

          {/* Footer Action - Slide Up Effect */}
          <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {job.postedAt}
            </div>

            <Button
              className={cn(
                "rounded-full px-6 transition-all duration-300 shadow-lg hover:shadow-primary/30 group-hover:scale-105",
                hasApplied ? "bg-secondary text-secondary-foreground" : "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              )}
              onClick={handleApplyClick}
              disabled={isApplying || hasApplied}
            >
              {isApplying ? "Wait..." : hasApplied ? "Applied" : "Apply Now"}
              {!hasApplied && !isApplying && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
