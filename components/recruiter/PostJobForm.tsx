"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface PostJobFormProps {
    onJobPosted: () => void;
}

export function PostJobForm({ onJobPosted }: PostJobFormProps) {
    const [jobTitle, setJobTitle] = useState("");
    const [jobCompany, setJobCompany] = useState("");
    const [jobLocation, setJobLocation] = useState("");
    const [jobExperience, setJobExperience] = useState("0");
    const [jobType, setJobType] = useState("Full-time");
    const [jobSkills, setJobSkills] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handlePostJob = async () => {
        if (!jobTitle.trim() || !jobDescription.trim() || !jobLocation.trim() || !jobSkills.trim()) {
            setError("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            await apiClient.postJob({
                title: jobTitle,
                description: jobDescription,
                location: jobLocation,
                min_experience: parseInt(jobExperience) || 0,
                skills: jobSkills,
                company: jobCompany || "Hiring Company",
                type: jobType
            });

            setSuccess("Job posted successfully!");
            setJobTitle("");
            setJobDescription("");
            setJobLocation("");
            setJobExperience("0");
            setJobSkills("");
            setJobCompany("");
            setJobType("Full-time");

            onJobPosted();

            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to post job");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!jobTitle.trim()) {
            setError("Please enter a job title first");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const data = await apiClient.generateJobDescription({
                title: jobTitle,
                company: jobCompany,
                location: jobLocation,
                experience: jobExperience,
                skills: jobSkills,
                type: jobType
            });

            // Handle JSON response
            if (data.overview) {
                // Update form fields with AI-enhanced data
                if (data.title) setJobTitle(data.title);
                if (data.company) setJobCompany(data.company);
                if (data.location) setJobLocation(data.location);
                if (data.experience_required) setJobExperience(data.experience_required.replace(/[^0-9]/g, '') || "0");
                if (data.employment_type) setJobType(data.employment_type);

                // Construct formatted description
                const formattedDesc = [
                    data.overview,
                    "\nKey Responsibilities:",
                    ...(data.responsibilities?.map((r: string) => `• ${r}`) || []),
                    "\nRequired Qualifications:",
                    ...(data.required_qualifications?.map((q: string) => `• ${q}`) || []),
                    "\nPreferred Qualifications:",
                    ...(data.preferred_qualifications?.map((q: string) => `• ${q}`) || []),
                    "\nBenefits:",
                    ...(data.benefits?.map((b: string) => `• ${b}`) || []),
                    `\n${data.company_statement || ""}`
                ].join("\n");

                setJobDescription(formattedDesc);
            } else {
                // Fallback if JSON parsing failed but text returned
                setJobDescription(data.description || "AI-generated job description...");
            }

        } catch (err: any) {
            setError(err.message || "Failed to generate description");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto border-premium">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Post a New Job
                </CardTitle>
                <CardDescription>
                    Create a job posting with AI assistance
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm">
                        {success}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Job Title *</label>
                        <Input
                            placeholder="e.g., Senior Full Stack Developer"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            data-testid="input-job-title"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Company</label>
                        <Input
                            placeholder="e.g., Tech Corp"
                            value={jobCompany}
                            onChange={(e) => setJobCompany(e.target.value)}
                            data-testid="input-job-company"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Location *</label>
                        <Input
                            placeholder="e.g., Remote, San Francisco"
                            value={jobLocation}
                            onChange={(e) => setJobLocation(e.target.value)}
                            data-testid="input-job-location"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Min Experience (years)</label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={jobExperience}
                            onChange={(e) => setJobExperience(e.target.value)}
                            data-testid="input-job-experience"
                            disabled={isSubmitting}
                            min="0"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Job Type</label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={jobType}
                            onChange={(e) => setJobType(e.target.value)}
                            data-testid="select-job-type"
                            disabled={isSubmitting}
                        >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Skills *</label>
                    <Input
                        placeholder="e.g., Python, React, AWS"
                        value={jobSkills}
                        onChange={(e) => setJobSkills(e.target.value)}
                        data-testid="input-job-skills"
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">Separate multiple skills with commas</p>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Job Description *</label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAIGenerate}
                            data-testid="button-ai-generate"
                            disabled={isSubmitting}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {isSubmitting ? "Generating..." : "Generate with AI"}
                        </Button>
                    </div>
                    <Textarea
                        placeholder="Describe the role, responsibilities, and requirements..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        rows={12}
                        data-testid="textarea-job-description"
                        disabled={isSubmitting}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        className="flex-1"
                        data-testid="button-post-job"
                        onClick={handlePostJob}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Posting..." : "Post Job"}
                    </Button>
                    <Button
                        variant="outline"
                        data-testid="button-save-draft"
                        disabled={isSubmitting}
                    >
                        Save Draft
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
