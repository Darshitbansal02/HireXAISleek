import { useResumeStore } from "@/lib/store/resume-store";
import { MapPin, Phone, Mail, Linkedin, Globe, ExternalLink } from "lucide-react";

export function BuilderPreview() {
    const { resume } = useResumeStore();
    const { personal_info, experience, education, projects, skills } = resume;

    if (!personal_info.full_name && experience.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-white border shadow-sm aspect-[210/297]">
                <p>Start typing to see your resume preview...</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white text-black shadow-lg print:shadow-none min-h-[297mm] p-6 text-sm leading-tight font-sans" id="resume-preview">
            {/* Header */}
            <header className="border-b-2 border-gray-800 pb-2 mb-3">
                <h1 className="text-2xl font-bold uppercase tracking-wide mb-0.5">{personal_info.full_name || "Your Name"}</h1>
                <p className="text-base text-gray-600 mb-1.5">{personal_info.title || "Professional Title"}</p>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                    {personal_info.email && (
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {personal_info.email}
                        </div>
                    )}
                    {personal_info.phone && (
                        <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {personal_info.phone}
                        </div>
                    )}
                    {personal_info.location && (
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {personal_info.location}
                        </div>
                    )}
                    {personal_info.linkedin_url && (
                        <div className="flex items-center gap-1">
                            <Linkedin className="h-3 w-3" />
                            <a href={personal_info.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>
                        </div>
                    )}
                    {personal_info.portfolio_url && (
                        <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <a href={personal_info.portfolio_url} target="_blank" rel="noreferrer" className="hover:underline">Portfolio</a>
                        </div>
                    )}
                </div>
            </header>

            {/* Summary */}
            {personal_info.summary && (
                <section className="mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-1.5 pb-0.5">Professional Summary</h2>
                    <p className="text-gray-800 whitespace-pre-wrap text-sm">{personal_info.summary}</p>
                </section>
            )}

            {/* Experience */}
            {experience.length > 0 && (
                <section className="mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-1.5 pb-0.5">Experience</h2>
                    <div className="space-y-2">
                        {experience.map((exp) => (
                            <div key={exp.id}>
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className="font-bold text-gray-900 text-sm">{exp.title}</h3>
                                    <span className="text-xs text-gray-600 whitespace-nowrap">
                                        {exp.start_date} - {exp.current ? "Present" : exp.end_date}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-gray-700 font-medium text-xs">{exp.company}</span>
                                    {exp.location && <span className="text-xs text-gray-500">{exp.location}</span>}
                                </div>
                                <p className="text-gray-800 whitespace-pre-wrap text-sm leading-tight">{exp.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Projects */}
            {projects.length > 0 && (
                <section className="mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-1.5 pb-0.5">Projects</h2>
                    <div className="space-y-1.5">
                        {projects.map((proj) => (
                            <div key={proj.id}>
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        {proj.name}
                                        {proj.link && (
                                            <a href={proj.link} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-black">
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </h3>
                                </div>
                                <p className="text-gray-800 text-sm mb-0.5 leading-tight">{proj.description}</p>
                                {proj.technologies.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {proj.technologies.map((tech, i) => (
                                            <span key={i} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <section className="mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-1.5 pb-0.5">Skills</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
                        {skills.map((cat, i) => (
                            <div key={i} className="flex text-sm">
                                <span className="font-bold w-24 flex-shrink-0">{cat.category}:</span>
                                <span className="text-gray-800">{cat.skills.join(", ")}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Education */}
            {education.length > 0 && (
                <section className="mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-1.5 pb-0.5">Education</h2>
                    <div className="space-y-1">
                        {education.map((edu) => (
                            <div key={edu.id} className="flex justify-between items-baseline text-sm">
                                <div className="text-gray-900">
                                    <span className="font-bold">{edu.degree}</span>
                                    {edu.field && <span> — {edu.field}</span>}
                                    <span className="text-gray-700"> — {edu.school}</span>
                                </div>
                                <span className="text-xs text-gray-600 whitespace-nowrap">({edu.year})</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
