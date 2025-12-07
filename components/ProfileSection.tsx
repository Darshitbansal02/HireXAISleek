"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Linkedin, Globe, MapPin, Briefcase, GraduationCap, LinkIcon, CheckCircle2, Sparkles, Loader2, Plus, X, Save, User } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { motion } from "framer-motion";
import { ExperienceList } from "./profile/ExperienceList";
import { EducationList } from "./profile/EducationList";
import { SkillsList } from "./profile/SkillsList";

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
                    className="pointer-events-auto"
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
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto" >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">My Profile</h2>
                    <p className="text-muted-foreground">Manage your professional identity</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Basic Info */}
                <Card className="border-premium">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Professional Headline</label>
                                <Input
                                    placeholder="e.g. Senior Full Stack Developer"
                                    value={profile.headline}
                                    onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Location</label>
                                <Input
                                    placeholder="e.g. San Francisco, CA"
                                    value={profile.location}
                                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <Input
                                    placeholder="+1 (555) 000-0000"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Professional Bio</label>
                            <Textarea
                                placeholder="Tell us about your professional journey..."
                                className="min-h-[100px]"
                                value={profile.bio}
                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Skills */}
                <Card className="border-premium">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-full px-2 py-1">
                                {profile.skills.length}
                            </Badge>
                            Skills
                        </CardTitle>
                        <CardDescription>Add skills to improve job matching</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add a skill (e.g. React, Python)"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                            />
                            <Button onClick={addSkill} variant="secondary">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <SkillsList skills={profile.skills} onRemove={removeSkill} />
                    </CardContent>
                </Card>

                {/* Links */}
                <Card className="border-premium">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-primary" />
                            Social Links
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">LinkedIn URL</label>
                                <Input
                                    placeholder="https://linkedin.com/in/..."
                                    value={profile.linkedin_url}
                                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Portfolio URL</label>
                                <Input
                                    placeholder="https://..."
                                    value={profile.portfolio_url}
                                    onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resume Upload & Viewer */}
                <Card className="border-premium">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Resume
                        </CardTitle>
                        <CardDescription>Upload your resume to apply for jobs and get AI analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Upload Zone */}
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdf,.docx,.txt"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        try {
                                            setSaving(true);
                                            await apiClient.uploadResume(file);
                                            // Force a small delay to ensure DB commit
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                            await fetchProfile();
                                            if (onProfileUpdate) onProfileUpdate();
                                        } catch (error) {
                                            console.error("Upload failed", error);
                                            alert("Upload failed");
                                        } finally {
                                            setSaving(false);
                                            // Reset input
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                            {saving ? (
                                <div className="pointer-events-none">
                                    <Loader2 className="h-8 w-8 mx-auto text-primary mb-2 animate-spin" />
                                    <p className="text-sm font-medium">Uploading resume...</p>
                                </div>
                            ) : (
                                <div className="pointer-events-none">
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                    <p className="text-sm font-medium">Drop your resume here or click to upload</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT</p>
                                </div>
                            )}
                        </div>

                        {/* Resume Viewer (shown if resume exists) */}
                        {profile.resume_url && (
                            <div className="card-premium p-4 space-y-4 bg-gradient-to-br from-primary/5 to-purple-500/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="mt-1 p-2 rounded-lg bg-primary/10">
                                            <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate">Current Resume</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Uploaded and ready for applications
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Ready
                                    </Badge>
                                </div>

                                {/* PDF Viewer */}
                                <div className="aspect-[16/9] w-full bg-muted/20 rounded-lg border border-border/50 overflow-hidden relative group">
                                    <SecurePdfViewer />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                                        disabled={saving}
                                        onClick={async () => {
                                            if (window.confirm("Are you sure you want to delete your resume? This cannot be undone.")) {
                                                try {
                                                    setSaving(true);
                                                    await apiClient.deleteResume();
                                                    await fetchProfile();
                                                    if (onProfileUpdate) onProfileUpdate();
                                                } catch (error) {
                                                    console.error("Failed to delete resume:", error);
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Experience Section */}
                <Card className="border-premium">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            Experience
                        </CardTitle>
                        <CardDescription>Add your professional experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ExperienceList
                            experiences={profile.experience}
                            onDelete={(index) => {
                                const newExp = [...profile.experience];
                                newExp.splice(index, 1);
                                setProfile({ ...profile, experience: newExp });
                            }}
                        />
                        <div className="grid gap-4 p-4 border rounded-lg bg-muted/20">
                            <h4 className="text-sm font-medium">Add New Experience</h4>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input
                                    placeholder="Job Title"
                                    value={newExperience.title}
                                    onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                                />
                                <Input
                                    placeholder="Company"
                                    value={newExperience.company}
                                    onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                                />
                                <Input
                                    placeholder="Start Date (e.g. 2020)"
                                    value={newExperience.start_date}
                                    onChange={(e) => setNewExperience({ ...newExperience, start_date: e.target.value })}
                                />
                                <Input
                                    placeholder="End Date (e.g. 2022 or Present)"
                                    value={newExperience.end_date}
                                    onChange={(e) => setNewExperience({
                                        ...newExperience,
                                        end_date: e.target.value,
                                        current: e.target.value.toLowerCase() === 'present'
                                    })}
                                />
                            </div>
                            <Button
                                variant="secondary"
                                onClick={handleAddExperience}
                                disabled={!newExperience.title || !newExperience.company}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Experience
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Education Section */}
                <Card className="border-premium">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            Education
                        </CardTitle>
                        <CardDescription>Add your educational background</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <EducationList
                            education={profile.education}
                            onDelete={(index) => {
                                const newEdu = [...profile.education];
                                newEdu.splice(index, 1);
                                setProfile({ ...profile, education: newEdu });
                            }}
                        />
                        <div className="grid gap-4 p-4 border rounded-lg bg-muted/20">
                            <h4 className="text-sm font-medium">Add New Education</h4>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input
                                    placeholder="School / University"
                                    value={newEducation.school}
                                    onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })}
                                />
                                <Input
                                    placeholder="Degree"
                                    value={newEducation.degree}
                                    onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                                />
                                <Input
                                    placeholder="Field of Study"
                                    value={newEducation.field}
                                    onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
                                />
                                <Input
                                    placeholder="Year of Graduation"
                                    value={newEducation.year}
                                    onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
                                />
                            </div>
                            <Button
                                variant="secondary"
                                onClick={handleAddEducation}
                                disabled={!newEducation.school || !newEducation.degree}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Education
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
