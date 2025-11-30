import { useState, useEffect, useRef } from "react";
import { useResumeStore, ExperienceItem, EducationItem, ProjectItem, SkillItem } from "@/lib/store/resume-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Sparkles, Wand2, Save, ArrowRight, ArrowLeft, Download } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

// Helper component for comma-separated inputs to avoid cursor jumping
function CommaSeparatedInput({
    value,
    onChange,
    placeholder,
    className
}: {
    value: string[],
    onChange: (val: string[]) => void,
    placeholder?: string,
    className?: string
}) {
    const [localValue, setLocalValue] = useState(value.join(", "));

    // Sync local value when prop changes (e.g. initial load or external update)
    useEffect(() => {
        const parsedLocal = localValue.split(",").map(s => s.trim()).filter(Boolean);
        if (JSON.stringify(parsedLocal) !== JSON.stringify(value)) {
            setLocalValue(value.join(", "));
        }
    }, [value, localValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);
        // Update parent immediately for live preview
        const parsed = newVal.split(",").map(s => s.trim()).filter(Boolean);
        onChange(parsed);
    };

    const handleBlur = () => {
        const newValue = localValue.split(",").map(s => s.trim()).filter(Boolean);
        onChange(newValue);
        setLocalValue(newValue.join(", "));
    };

    return (
        <Input
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={className}
        />
    );
}

export function BuilderWizard() {
    const { resume, updatePersonalInfo, addExperience, updateExperience, removeExperience, addEducation, updateEducation, removeEducation, addProject, updateProject, removeProject, updateSkills, saveResume, isSaving } = useResumeStore();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("personal");
    const [polishing, setPolishing] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when items are added
    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }
        }, 100);
    };

    const handleAddExperience = () => {
        addExperience({ id: Date.now().toString(), title: "", company: "", start_date: "", current: false, description: "" });
        scrollToBottom();
    };

    const handleAddEducation = () => {
        addEducation({ id: Date.now().toString(), degree: "", school: "", year: "", field: "" });
        scrollToBottom();
    };

    const handleAddProject = () => {
        addProject({ id: Date.now().toString(), name: "", description: "", technologies: [] });
        scrollToBottom();
    };

    const handlePolish = async (text: string, section: string, onComplete: (text: string) => void) => {
        if (!text || text.length < 10) {
            toast({ title: "Text too short", description: "Please write a bit more before polishing.", variant: "destructive" });
            return;
        }
        setPolishing(section);
        try {
            const result = await apiClient.polishText(text, section);
            onComplete(result.polished_text);
            toast({ title: "Polished!", description: "Text has been improved by AI." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to polish text.", variant: "destructive" });
        } finally {
            setPolishing(null);
        }
    };

    const handleGenerateSummary = async () => {
        setPolishing("summary-gen");
        try {
            const result = await apiClient.generateResumeSummary(resume);
            updatePersonalInfo({ summary: result.summary });
            toast({ title: "Generated!", description: "Professional summary created." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to generate summary.", variant: "destructive" });
        } finally {
            setPolishing(null);
        }
    };

    const handleDownloadPDF = () => {
        window.print();
    };

    const nextTab = (current: string) => {
        const tabs = ["personal", "experience", "education", "projects", "skills", "summary"];
        const idx = tabs.indexOf(current);
        if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
    };

    const prevTab = (current: string) => {
        const tabs = ["personal", "experience", "education", "projects", "skills", "summary"];
        const idx = tabs.indexOf(current);
        if (idx > 0) setActiveTab(tabs[idx - 1]);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Resume Builder</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadPDF} title="Download PDF">
                        <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button onClick={() => saveResume(true)} disabled={isSaving}>
                        {isSaving ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-6 w-full mb-4">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="experience">Exp</TabsTrigger>
                    <TabsTrigger value="education">Edu</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>

                <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 space-y-6 pb-20 min-h-0">
                    {/* PERSONAL INFO */}
                    <TabsContent value="personal" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Start with your basic contact details.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input value={resume.personal_info.full_name} onChange={(e) => updatePersonalInfo({ full_name: e.target.value })} placeholder="John Doe" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Job Title</Label>
                                        <Input value={resume.personal_info.title || ""} onChange={(e) => updatePersonalInfo({ title: e.target.value })} placeholder="Software Engineer" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input value={resume.personal_info.email} onChange={(e) => updatePersonalInfo({ email: e.target.value })} placeholder="john@example.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input value={resume.personal_info.phone || ""} onChange={(e) => updatePersonalInfo({ phone: e.target.value })} placeholder="+1 234 567 890" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Location</Label>
                                        <Input value={resume.personal_info.location || ""} onChange={(e) => updatePersonalInfo({ location: e.target.value })} placeholder="New York, NY" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>LinkedIn URL</Label>
                                        <Input value={resume.personal_info.linkedin_url || ""} onChange={(e) => updatePersonalInfo({ linkedin_url: e.target.value })} placeholder="linkedin.com/in/johndoe" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Portfolio URL</Label>
                                        <Input value={resume.personal_info.portfolio_url || ""} onChange={(e) => updatePersonalInfo({ portfolio_url: e.target.value })} placeholder="johndoe.com" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end"><Button onClick={() => nextTab("personal")}>Next: Experience <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                    </TabsContent>

                    {/* EXPERIENCE */}
                    <TabsContent value="experience" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div><CardTitle>Experience</CardTitle><CardDescription>Add your relevant work experience.</CardDescription></div>
                                    <Button size="sm" onClick={handleAddExperience}><Plus className="mr-2 h-4 w-4" /> Add Job</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {resume.experience.map((exp, index) => (
                                    <div key={exp.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/20">
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => removeExperience(exp.id)}><Trash2 className="h-4 w-4" /></Button>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Job Title</Label><Input value={exp.title} onChange={(e) => updateExperience(exp.id, { title: e.target.value })} placeholder="Senior Developer" /></div>
                                            <div className="space-y-2"><Label>Company</Label><Input value={exp.company} onChange={(e) => updateExperience(exp.id, { company: e.target.value })} placeholder="Acme Corp" /></div>
                                            <div className="space-y-2"><Label>Start Date</Label><Input value={exp.start_date} onChange={(e) => updateExperience(exp.id, { start_date: e.target.value })} placeholder="Jan 2020" /></div>
                                            <div className="space-y-2"><Label>End Date</Label><Input value={exp.end_date || ""} onChange={(e) => updateExperience(exp.id, { end_date: e.target.value })} placeholder="Present" disabled={exp.current} /></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label>Description</Label>
                                                <Button variant="ghost" size="xs" className="h-6 text-xs text-primary" onClick={() => handlePolish(exp.description, "experience", (text) => updateExperience(exp.id, { description: text }))} disabled={polishing === `experience`}>
                                                    {polishing ? <Sparkles className="mr-1 h-3 w-3 animate-spin" /> : <Wand2 className="mr-1 h-3 w-3" />} AI Polish
                                                </Button>
                                            </div>
                                            <Textarea value={exp.description} onChange={(e) => updateExperience(exp.id, { description: e.target.value })} placeholder="• Led a team of 5 developers..." className="min-h-[100px]" />
                                        </div>
                                    </div>
                                ))}
                                {resume.experience.length === 0 && <div className="text-center py-8 text-muted-foreground">No experience added yet.</div>}
                            </CardContent>
                        </Card>
                        <div className="flex justify-between"><Button variant="outline" onClick={() => prevTab("experience")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><Button onClick={() => nextTab("experience")}>Next: Education <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                    </TabsContent>

                    {/* EDUCATION */}
                    <TabsContent value="education" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div><CardTitle>Education</CardTitle><CardDescription>Add your educational background.</CardDescription></div>
                                    <Button size="sm" onClick={handleAddEducation}><Plus className="mr-2 h-4 w-4" /> Add Education</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {resume.education.map((edu) => (
                                    <div key={edu.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/20">
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => removeEducation(edu.id)}><Trash2 className="h-4 w-4" /></Button>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>School/University</Label><Input value={edu.school} onChange={(e) => updateEducation(edu.id, { school: e.target.value })} placeholder="University of Tech" /></div>
                                            <div className="space-y-2"><Label>Degree</Label><Input value={edu.degree} onChange={(e) => updateEducation(edu.id, { degree: e.target.value })} placeholder="Bachelor of Science" /></div>
                                            <div className="space-y-2"><Label>Field of Study</Label><Input value={edu.field} onChange={(e) => updateEducation(edu.id, { field: e.target.value })} placeholder="Computer Science" /></div>
                                            <div className="space-y-2"><Label>Year</Label><Input value={edu.year} onChange={(e) => updateEducation(edu.id, { year: e.target.value })} placeholder="2019 - 2023" /></div>
                                        </div>
                                    </div>
                                ))}
                                {resume.education.length === 0 && <div className="text-center py-8 text-muted-foreground">No education added yet.</div>}
                            </CardContent>
                        </Card>
                        <div className="flex justify-between"><Button variant="outline" onClick={() => prevTab("education")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><Button onClick={() => nextTab("education")}>Next: Projects <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                    </TabsContent>

                    {/* PROJECTS */}
                    <TabsContent value="projects" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div><CardTitle>Projects</CardTitle><CardDescription>Showcase your best work.</CardDescription></div>
                                    <Button size="sm" onClick={handleAddProject}><Plus className="mr-2 h-4 w-4" /> Add Project</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {resume.projects.map((proj) => (
                                    <div key={proj.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/20">
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => removeProject(proj.id)}><Trash2 className="h-4 w-4" /></Button>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Project Name</Label><Input value={proj.name} onChange={(e) => updateProject(proj.id, { name: e.target.value })} placeholder="E-commerce App" /></div>
                                            <div className="space-y-2"><Label>Link (Optional)</Label><Input value={proj.link || ""} onChange={(e) => updateProject(proj.id, { link: e.target.value })} placeholder="github.com/..." /></div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Technologies (comma separated)</Label>
                                            <CommaSeparatedInput
                                                value={proj.technologies}
                                                onChange={(newTechs) => updateProject(proj.id, { technologies: newTechs })}
                                                placeholder="React, Node.js, TypeScript"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label>Description</Label>
                                                <Button variant="ghost" size="xs" className="h-6 text-xs text-primary" onClick={() => handlePolish(proj.description, "project", (text) => updateProject(proj.id, { description: text }))} disabled={polishing === `project`}>
                                                    {polishing ? <Sparkles className="mr-1 h-3 w-3 animate-spin" /> : <Wand2 className="mr-1 h-3 w-3" />} AI Polish
                                                </Button>
                                            </div>
                                            <Textarea value={proj.description} onChange={(e) => updateProject(proj.id, { description: e.target.value })} placeholder="Built a full-stack application..." />
                                        </div>
                                    </div>
                                ))}
                                {resume.projects.length === 0 && <div className="text-center py-8 text-muted-foreground">No projects added yet.</div>}
                            </CardContent>
                        </Card>
                        <div className="flex justify-between"><Button variant="outline" onClick={() => prevTab("projects")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><Button onClick={() => nextTab("projects")}>Next: Skills <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                    </TabsContent>

                    {/* SKILLS */}
                    <TabsContent value="skills" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader><CardTitle>Skills</CardTitle><CardDescription>List your technical skills.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    {resume.skills.map((cat, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <Input className="w-1/3" value={cat.category} onChange={(e) => {
                                                const newSkills = [...resume.skills];
                                                newSkills[i].category = e.target.value;
                                                updateSkills(newSkills);
                                            }} placeholder="Category (e.g. Languages)" />
                                            <div className="flex-1">
                                                <CommaSeparatedInput
                                                    value={cat.skills}
                                                    onChange={(newSkillList) => {
                                                        const newSkills = [...resume.skills];
                                                        newSkills[i].skills = newSkillList;
                                                        updateSkills(newSkills);
                                                    }}
                                                    placeholder="Python, JavaScript, C++"
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newSkills = resume.skills.filter((_, idx) => idx !== i);
                                                updateSkills(newSkills);
                                            }}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={() => updateSkills([...resume.skills, { category: "", skills: [] }])}><Plus className="mr-2 h-4 w-4" /> Add Skill Category</Button>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-between"><Button variant="outline" onClick={() => prevTab("skills")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><Button onClick={() => nextTab("skills")}>Next: Summary <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                    </TabsContent>

                    {/* SUMMARY */}
                    <TabsContent value="summary" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div><CardTitle>Professional Summary</CardTitle><CardDescription>A brief overview of your profile.</CardDescription></div>
                                    <Button variant="secondary" size="sm" onClick={handleGenerateSummary} disabled={polishing === "summary-gen"}>
                                        {polishing === "summary-gen" ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} AI Generate
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={resume.personal_info.summary || ""}
                                    onChange={(e) => updatePersonalInfo({ summary: e.target.value })}
                                    placeholder="Experienced software engineer with..."
                                    className="min-h-[200px] text-base"
                                />
                            </CardContent>
                        </Card>
                        <div className="flex justify-between"><Button variant="outline" onClick={() => prevTab("summary")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><Button onClick={() => saveResume(false)}>Finish & Save <Save className="ml-2 h-4 w-4" /></Button></div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
