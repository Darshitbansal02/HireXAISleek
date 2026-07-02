import { ResumeStructure } from "@/lib/store/resume-store";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface TemplateProps {
    resume: ResumeStructure;
}

export function CreativeTemplate({ resume }: TemplateProps) {
    const { personal_info, experience, education, projects, skills } = resume;

    return (
        <div className="w-full h-full bg-slate-50 text-slate-900 min-h-[297mm] flex flex-col">

            {/* Geometric Header */}
            <div className="bg-indigo-600 text-white p-12 relative overflow-hidden clip-path-slant">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-extrabold tracking-tight mb-2 font-display">{personal_info.full_name || "Your Name"}</h1>
                    <p className="text-2xl text-indigo-200 font-light tracking-widest uppercase">{personal_info.title || "Creative Title"}</p>
                </div>
            </div>

            <div className="flex flex-1">
                {/* Sidebar */}
                <div className="w-1/3 bg-slate-100 p-8 border-r border-slate-200">
                    <div className="space-y-8">
                        {/* Contact */}
                        <div className="space-y-4">
                            <h3 className="text-indigo-600 font-black uppercase text-sm tracking-wider border-b-2 border-indigo-200 pb-2">Connect</h3>
                            <div className="space-y-3 text-sm font-medium text-slate-700">
                                {personal_info.email && <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-indigo-500" /> {personal_info.email}</div>}
                                {personal_info.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-indigo-500" /> {personal_info.phone}</div>}
                                {personal_info.location && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-indigo-500" /> {personal_info.location}</div>}
                                {personal_info.linkedin_url && <div className="flex items-center gap-3"><Linkedin className="h-4 w-4 text-indigo-500" /> LinkedIn</div>}
                            </div>
                        </div>

                        {/* Education */}
                        {education.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-indigo-600 font-black uppercase text-sm tracking-wider border-b-2 border-indigo-200 pb-2">Education</h3>
                                {education.map(edu => (
                                    <div key={edu.id} className="text-sm">
                                        <div className="font-bold text-slate-800">{edu.degree}</div>
                                        <div className="text-slate-600">{edu.school}</div>
                                        <div className="text-indigo-500 font-mono text-xs mt-1">{edu.year}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-indigo-600 font-black uppercase text-sm tracking-wider border-b-2 border-indigo-200 pb-2">Expertise</h3>
                                {skills.map((cat, i) => (
                                    <div key={i}>
                                        <div className="text-xs font-bold uppercase text-slate-400 mb-2">{cat.category}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {cat.skills.map((skill, j) => (
                                                <span key={j} className="px-2 py-1 bg-white border border-indigo-100 rounded-md text-xs font-semibold text-indigo-700 shadow-sm">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 space-y-10">

                    {/* Summary */}
                    {personal_info.summary && (
                        <div>
                            <p className="text-lg leading-relaxed text-slate-600 font-light italic border-l-4 border-indigo-500 pl-4">
                                {personal_info.summary}
                            </p>
                        </div>
                    )}

                    {/* Experience */}
                    {experience.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center">
                                Experience <span className="ml-4 h-px bg-slate-200 flex-1"></span>
                            </h2>
                            <div className="space-y-8">
                                {experience.map(exp => (
                                    <div key={exp.id} className="group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">{exp.title}</h3>
                                                <div className="text-indigo-600 font-medium">{exp.company}</div>
                                            </div>
                                            <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                                                {exp.start_date} - {exp.current ? "Present" : exp.end_date}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects */}
                    {projects.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center">
                                Projects <span className="ml-4 h-px bg-slate-200 flex-1"></span>
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {projects.map(proj => (
                                    <div key={proj.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                        <h4 className="font-bold text-slate-800 mb-1">{proj.name}</h4>
                                        <p className="text-sm text-slate-600 mb-3">{proj.description}</p>
                                        <div className="flex gap-2">
                                            {proj.technologies.slice(0, 3).map((t, k) => (
                                                <span key={k} className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
