import { ResumeStructure } from "@/lib/store/resume-store";
import { Mail, Phone, MapPin, Linkedin, Globe, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateProps {
    resume: ResumeStructure;
}

export function ModernTemplate({ resume }: TemplateProps) {
    const { personal_info, experience, education, projects, skills } = resume;

    return (
        <div className="w-full h-full bg-white text-slate-800 p-0 flex flex-col md:flex-row min-h-[297mm] shadow-sm">
            {/* Sidebar */}
            <div className="w-[32%] bg-slate-900 text-white p-6 flex flex-col gap-6">
                <div className="space-y-4 text-center">
                    {/* Placeholder for Photo if we had one */}
                    <div className="h-32 w-32 rounded-full bg-slate-800 mx-auto border-4 border-slate-700 flex items-center justify-center text-4xl font-bold text-slate-600">
                        {personal_info.full_name ? personal_info.full_name[0] : "?"}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 text-sm">
                    <h3 className="text-slate-400 uppercase tracking-widest text-xs font-bold border-b border-slate-800 pb-1 mb-2">Contact</h3>
                    {personal_info.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 shrink-0 text-blue-400" />
                            <span className="truncate">{personal_info.email}</span>
                        </div>
                    )}
                    {personal_info.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 shrink-0 text-blue-400" />
                            <span>{personal_info.phone}</span>
                        </div>
                    )}
                    {personal_info.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 shrink-0 text-blue-400" />
                            <span>{personal_info.location}</span>
                        </div>
                    )}
                    {personal_info.linkedin_url && (
                        <div className="flex items-center gap-2">
                            <Linkedin className="h-3 w-3 shrink-0 text-blue-400" />
                            <a href={personal_info.linkedin_url} target="_blank" className="hover:text-blue-300 truncate">LinkedIn</a>
                        </div>
                    )}
                    {personal_info.portfolio_url && (
                        <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 shrink-0 text-blue-400" />
                            <a href={personal_info.portfolio_url} target="_blank" className="hover:text-blue-300 truncate">Portfolio</a>
                        </div>
                    )}
                </div>

                {/* Education */}
                {education.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-slate-400 uppercase tracking-widest text-xs font-bold border-b border-slate-800 pb-1 mb-2">Education</h3>
                        {education.map(edu => (
                            <div key={edu.id} className="text-sm">
                                <div className="font-bold text-blue-200">{edu.degree}</div>
                                <div className="text-xs text-slate-400">{edu.school}</div>
                                <div className="text-xs text-slate-500">{edu.year}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-slate-400 uppercase tracking-widest text-xs font-bold border-b border-slate-800 pb-1 mb-2">Skills</h3>
                        {skills.map((cat, i) => (
                            <div key={i} className="text-sm">
                                <span className="block font-semibold text-blue-200 mb-1 text-xs uppercase">{cat.category}</span>
                                <div className="flex flex-wrap gap-1">
                                    {cat.skills.map((skill, j) => (
                                        <span key={j} className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 space-y-6 bg-slate-50/50">
                <header className="border-b-2 border-slate-200 pb-6">
                    <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-900 mb-2">{personal_info.full_name || "Your Name"}</h1>
                    <p className="text-xl text-blue-600 font-medium">{personal_info.title || "Professional Title"}</p>
                </header>

                {/* Summary */}
                {personal_info.summary && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-blue-600 rounded-full"></span> Profile
                        </h2>
                        <p className="text-slate-700 leading-relaxed text-sm text-justify">
                            {personal_info.summary}
                        </p>
                    </section>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-blue-600 rounded-full"></span> Experience
                        </h2>
                        <div className="space-y-5 border-l-2 border-slate-200 ml-1.5 pl-6">
                            {experience.map(exp => (
                                <div key={exp.id} className="relative">
                                    <div className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-blue-600 bg-white"></div>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-slate-900 text-base">{exp.title}</h3>
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                            {exp.start_date} - {exp.current ? "Present" : exp.end_date}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-600 mb-2">{exp.company}</div>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-blue-600 rounded-full"></span> Projects
                        </h2>
                        <div className="grid gap-4">
                            {projects.map(proj => (
                                <div key={proj.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                            {proj.name}
                                            {proj.link && (
                                                <a href={proj.link} target="_blank" className="text-blue-500 hover:text-blue-700">
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">{proj.description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {proj.technologies.map((tech, i) => (
                                            <span key={i} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
