"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, Clock, Sparkles, Bookmark, TrendingUp } from "lucide-react";
import { SkillBadge } from "./SkillBadge";
import { motion } from "framer-motion";

interface JobCardProps {
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    type: string;
    postedAt: string;
    matchScore?: number;
    skills: string[];
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
  const handleApplyClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking apply
    if (onApply) {
      await onApply(job.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={onClick ? "cursor-pointer" : ""}
    >
      <Card
        className="group relative overflow-hidden border-premium hover:border-primary/50 transition-all duration-500 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:-translate-y-1"
        data-testid={`card-job-${job.id}`}
      >
        {/* Gradient Background on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Match Score Badge - Floating */}
        {job.matchScore && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="absolute top-4 right-4 z-10"
          >
            <Badge
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg px-3 py-1.5"
              data-testid={`badge-match-${job.id}`}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              <span className="font-semibold">{job.matchScore}% Match</span>
            </Badge>
          </motion.div>
        )}

        <CardHeader className="relative z-10 pb-4">
          <div className="flex items-start justify-between gap-4 pr-24">
            <div className="flex-1 space-y-2">
              <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors leading-tight">
                {job.title}
              </CardTitle>
              <CardDescription className="text-base font-medium flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                {job.company}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 relative z-10">
          {/* Job Details */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{job.location}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-medium">{job.type}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">{job.postedAt}</span>
            </div>
          </div>

          {/* Salary */}
          {job.salary && (
            <div className="flex items-center gap-2 text-lg font-bold text-primary">
              <TrendingUp className="h-5 w-5" />
              {job.salary}
            </div>
          )}

          {/* Skills */}
          <div className="flex flex-wrap gap-2">
            {job.skills.slice(0, 5).map((skill) => (
              <SkillBadge key={skill} skill={skill} />
            ))}
            {job.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{job.skills.length - 5} more
              </Badge>
            )}
          </div>

          {/* Minimum Experience */}
          {job.minExperience !== undefined && job.minExperience > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Experience: </span>
              {job.minExperience}+ years
            </div>
          )}

          {/* Description Preview */}
          {job.description && (
            <div className="text-sm text-muted-foreground line-clamp-3 border-l-2 border-primary/30 pl-3 py-1">
              {job.description}
            </div>
          )}

          {/* Action Buttons */}
          {footer ? (
            footer
          ) : (
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 font-semibold shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-primary to-accent hover:opacity-90"
                onClick={handleApplyClick}
                disabled={isApplying || hasApplied}
                data-testid={`button-apply-${job.id}`}
              >
                {hasApplied ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Applied
                  </>
                ) : isApplying ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Applying...
                  </>
                ) : (
                  "Apply Now"
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hover:bg-accent/10 hover:border-primary/30 transition-colors"
                data-testid={`button-save-${job.id}`}
              >
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
