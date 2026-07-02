"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Linkedin, Globe, MapPin, Briefcase, GraduationCap, LinkIcon, CheckCircle2, Sparkles, Loader2, Plus, X, Save, User, Phone, Wand2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { motion } from "framer-motion";
import { ExperienceList } from "./profile/ExperienceList";
import { EducationList } from "./profile/EducationList";
import { SkillsList } from "./profile/SkillsList";
import { cn } from "@/lib/utils";

interface Experience {
    title: string;
    company: string;
    start_date: string;
    end_date?: string;
    description?: string;
    current: boolean;
}

interface Education {
    degree: string;
    school: string;
    year: string;
    field: string;
}

interface CompletionItem {
    key: string;
    label: string;
    weight: number;
    completed: boolean;
}

interface ProfileCompletion {
    percentage: number;
    items: CompletionItem[];
}

interface ProfileData {
    headline: string;
    phone: string;
    location: string;
    bio: string;
    skills: string[];
    experience: Experience[];
    education: Education[];
    linkedin_url: string;
    portfolio_url: string;
    resume_url?: string;
    resume_preview?: string;
    profile_completion?: ProfileCompletion;
}

const SecurePdfViewer = () => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPdf = async () => {
            try {
                const blob = await apiClient.fetchResumeFileBlob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } catch (error) {
                console.error("Failed to load PDF", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPdf();

        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, []);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!pdfUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted/10 text-muted-foreground">
                Failed to load PDF
            </div>
        );
    }

    return (
        <>
            <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="Resume Preview"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Button
                    variant="secondary"
                    size="sm"
                    className="pointer-events-auto shadow-lg"
                    onClick={() => window.open(pdfUrl, '_blank')}
                >
                    <FileText className="h-4 w-4 mr-2" />
                    Open Full PDF
                </Button>
            </div>
        </>
    );
};

export function ProfileSection({ onProfileUpdate }: { onProfileUpdate?: () => void }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<ProfileData>({
        headline: "",
        phone: "",
        location: "",
        bio: "",
        skills: [],
        experience: [],
        education: [],
        linkedin_url: "",
        portfolio_url: "",
    });

    const [newSkill, setNewSkill] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await apiClient.getProfile();
            if (data) {
                setProfile({
                    headline: data.headline || "",
                    phone: data.phone || "",
                    location: data.location || "",
                    bio: data.bio || "",
                    skills: data.skills || [],
                    experience: data.experience || [],
                    education: data.education || [],
                    linkedin_url: data.linkedin_url || "",
                    portfolio_url: data.portfolio_url || "",
                    resume_url: data.resume_url || "",
                    resume_preview: data.resume_preview || "",
                });
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);

        // Create a copy of the current profile to modify
        let profileToSave = { ...profile };
        let hasUpdates = false;

        // Auto-add pending experience if valid
        if (newExperience.title && newExperience.company) {
            const expToAdd = { ...newExperience };
            profileToSave.experience = [...profileToSave.experience, expToAdd];

            // Reset form
            setNewExperience({
                title: "",
                company: "",
                start_date: "",
                end_date: "",
                description: "",
                current: false
            });
            hasUpdates = true;
        }

        // Auto-add pending education if valid
        if (newEducation.school && newEducation.degree) {
            const eduToAdd = { ...newEducation };
            profileToSave.education = [...profileToSave.education, eduToAdd];

            // Reset form
            setNewEducation({
                degree: "",
                school: "",
                year: "",
                field: ""
            });
            hasUpdates = true;
        }

        // Update local state if we auto-added items
        if (hasUpdates) {
            setProfile(profileToSave);
        }

        try {
            await apiClient.updateProfile(profileToSave);
            if (onProfileUpdate) onProfileUpdate();
        } catch (error) {
            console.error("Failed to update profile:", error);
        } finally {
            setSaving(false);
        }
    };

    const addSkill = () => {
        if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
            setProfile(prev => ({
                ...prev,
                skills: [...prev.skills, newSkill.trim()]
            }));
            setNewSkill("");
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setProfile(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }));
    };

    const [newExperience, setNewExperience] = useState<Experience>({
        title: "",
        company: "",
        start_date: "",
        end_date: "",
        description: "",
        current: false
    });

    const [newEducation, setNewEducation] = useState<Education>({
        degree: "",
        school: "",
        year: "",
        field: ""
    });

    const handleAddExperience = () => {
        if (newExperience.title && newExperience.company) {
            setProfile(prev => ({
                ...prev,
                experience: [...prev.experience, { ...newExperience }]
            }));
            setNewExperience({
                title: "",
                company: "",
                start_date: "",
                end_date: "",
                description: "",
                current: false
            });
        }
    };

    const handleAddEducation = () => {
        if (newEducation.school && newEducation.degree) {
            setProfile(prev => ({
                ...prev,
                education: [...prev.education, { ...newEducation }]
            }));
            setNewEducation({
                degree: "",
                school: "",
                year: "",
                field: ""
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 fade-in-up">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 dark:to-blue-400">
                        My Profile
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Manage your professional identity and resume settings
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                        "gap-2 px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105",
                        saving ? "opacity-80" : ""
                    )}
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving Changes..." : "Save Profile"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column - Main Info */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Basic Info Card */}
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-white/50 dark:bg-card/50 backdrop-blur-sm hover:shadow-md transition-all">
                        <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent border-b border-border/50">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <User className="h-5 w-5" />
                                </div>
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Headline</label>
                                    <Input
                                        placeholder="E.g. Senior Full Stack Developer"
                                        value={profile.headline}
                                        onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                                        className="h-11 bg-white dark:bg-slate-950/50"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                                        <Input
                                            placeholder="E.g. San Francisco, CA"
                                            value={profile.location}
                                            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                            className="h-11 pl-10 bg-white dark:bg-slate-950/50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                                        <Input
                                            placeholder="+1 (555) 000-0000"
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            className="h-11 pl-10 bg-white dark:bg-slate-950/50"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Professional Bio</label>
                                <Textarea
                                    placeholder="Tell us about your professional journey..."
                                    className="min-h-[120px] bg-white dark:bg-slate-950/50 resize-y"
                                    value={profile.bio}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Experience Section */}
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-purple-500/5 via-transparent to-transparent border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                        <Briefcase className="h-5 w-5" />
                                    </div>
                                    Experience
                                </CardTitle>
                                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20">
                                    {profile.experience.length} Positions needs save
                                </Badge>
                            </div>
                            <CardDescription>Add your relevant work history</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <ExperienceList
                                experiences={profile.experience}
                                onDelete={(index) => {
                                    const newExp = [...profile.experience];
                                    newExp.splice(index, 1);
                                    setProfile({ ...profile, experience: newExp });
                                }}
                            />

                            <div className="p-5 border border-dashed border-border rounded-xl bg-muted/5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Plus className="h-4 w-4 text-primary" />
                                    Add New Experience
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Job Title"
                                        value={newExperience.title}
                                        onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                    <Input
                                        placeholder="Company"
                                        value={newExperience.company}
                                        onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                    <Input
                                        placeholder="Start Date (e.g. Jan 2020)"
                                        value={newExperience.start_date}
                                        onChange={(e) => setNewExperience({ ...newExperience, start_date: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                    <Input
                                        placeholder="End Date (e.g. Present)"
                                        value={newExperience.end_date}
                                        onChange={(e) => setNewExperience({
                                            ...newExperience,
                                            end_date: e.target.value,
                                            current: e.target.value.toLowerCase() === 'present'
                                        })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleAddExperience}
                                        disabled={!newExperience.title || !newExperience.company}
                                        className="hover:bg-primary/10 hover:text-primary"
                                    >
                                        Add to List
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Education Section */}
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-blue-500/5 via-transparent to-transparent border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <GraduationCap className="h-5 w-5" />
                                    </div>
                                    Education
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <EducationList
                                education={profile.education}
                                onDelete={(index) => {
                                    const newEdu = [...profile.education];
                                    newEdu.splice(index, 1);
                                    setProfile({ ...profile, education: newEdu });
                                }}
                            />

                            <div className="p-5 border border-dashed border-border rounded-xl bg-muted/5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Plus className="h-4 w-4 text-primary" />
                                    Add New Education
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input
                                        placeholder="School / University"
                                        value={newEducation.school}
                                        onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                    <Input
                                        placeholder="Degree"
                                        value={newEducation.degree}
                                        onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                    <Input
                                        placeholder="Field of Study"
                                        value={newEducation.field}
                                        onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                    <Input
                                        placeholder="Year"
                                        value={newEducation.year}
                                        onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleAddEducation}
                                        disabled={!newEducation.school || !newEducation.degree}
                                        className="hover:bg-primary/10 hover:text-primary"
                                    >
                                        Add to List
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resume Upload Widget - Moved from sidebar */}
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent border-b border-border/50">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <FileText className="h-5 w-5" />
                                </div>
                                Resume & CV
                            </CardTitle>
                            <CardDescription>Upload your resume for AI analysis and job applications</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid md:grid-cols-2 gap-8 items-start">
                                {/* Upload Zone */}
                                <div className="border-2 border-dashed border-primary/20 hover:border-primary/50 rounded-xl p-8 text-center transition-all bg-primary/5 hover:bg-primary/10 cursor-pointer relative group h-full flex flex-col justify-center">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        accept=".pdf,.docx,.txt"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                try {
                                                    setSaving(true);
                                                    await apiClient.uploadResume(file);
                                                    await new Promise(resolve => setTimeout(resolve, 500));
                                                    await fetchProfile();
                                                    if (onProfileUpdate) onProfileUpdate();
                                                } catch (error) {
                                                    console.error("Upload failed", error);
                                                    alert("Upload failed");
                                                } finally {
                                                    setSaving(false);
                                                    e.target.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    {saving ? (
                                        <div className="pointer-events-none">
                                            <Loader2 className="h-10 w-10 mx-auto text-primary mb-4 animate-spin" />
                                            <p className="text-sm font-semibold text-primary">Uploading & Analyzing...</p>
                                        </div>
                                    ) : (
                                        <div className="pointer-events-none space-y-3">
                                            <div className="h-12 w-12 mx-auto rounded-full bg-background shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Upload className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold text-foreground">Click to Upload Resume</p>
                                                <p className="text-xs text-muted-foreground mt-1">PDF or DOCX (Max 5MB)</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Preview / Status */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Current Resume</h4>
                                    {profile.resume_url ? (
                                        <div className="space-y-4">
                                            <div className="aspect-[3/4] w-full rounded-xl border border-border overflow-hidden bg-white relative shadow-sm group">
                                                <div className="absolute top-2 right-2 z-20">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                                                        <CheckCircle2 className="h-3 w-3" /> ACTIVE
                                                    </div>
                                                </div>
                                                <SecurePdfViewer />
                                            </div>

                                            <Button
                                                variant="outline"
                                                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 group"
                                                disabled={saving}
                                                onClick={async () => {
                                                    if (window.confirm("Delete your resume? This cannot be undone.")) {
                                                        try {
                                                            setSaving(true);
                                                            await apiClient.deleteResume();
                                                            await fetchProfile();
                                                            if (onProfileUpdate) onProfileUpdate();
                                                        } catch (error) {
                                                            console.error("Failed to delete", error);
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    }
                                                }}
                                            >
                                                <X className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> Remove Resume
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="h-[200px] rounded-xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                            <FileText className="h-8 w-8 mb-3 opacity-20" />
                                            <p className="text-sm">No resume uploaded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column - Side Widgets */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Skills Widget */}
                    <Card className="border-border/50 shadow-md bg-white/50 dark:bg-card/50 backdrop-blur-sm sticky top-6">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                Skills & Expertise
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add skill (e.g. React)"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                                    className="bg-white dark:bg-slate-950 h-9"
                                />
                                <Button onClick={addSkill} size="sm" className="h-9 w-9 p-0 shrink-0">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="min-h-[100px]">
                                <SkillsList skills={profile.skills} onRemove={removeSkill} />
                                {profile.skills.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4 italic">
                                        No skills added yet.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Links Widget */}
                    <Card className="border-border/50 bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <LinkIcon className="h-4 w-4 text-primary" />
                                Social Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Linkedin className="h-3 w-3" /> LinkedIn
                                </label>
                                <Input
                                    placeholder="Profile URL"
                                    value={profile.linkedin_url}
                                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                                    className="bg-white dark:bg-slate-950 h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Globe className="h-3 w-3" /> Portfolio
                                </label>
                                <Input
                                    placeholder="Website URL"
                                    value={profile.portfolio_url}
                                    onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                                    className="bg-white dark:bg-slate-950 h-9"
                                />
                            </div>
                        </CardContent>
                    </Card>



                </div>
            </div>
        </div>
    );
}
