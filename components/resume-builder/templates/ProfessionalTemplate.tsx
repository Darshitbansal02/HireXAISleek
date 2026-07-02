import { ResumeStructure } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";

interface TemplateProps {
    resume: ResumeStructure;
}

export function ProfessionalTemplate({ resume }: TemplateProps) {
    const { personal_info, experience, education, projects, skills } = resume;

    return (
        <div className="w-full h-full bg-white text-black p-10 min-h-[297mm] font-serif">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">{personal_info.full_name || "Your Name"}</h1>
                <p className="text-lg italic text-gray-700 mb-3">{personal_info.title || "Title"}</p>

                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 font-sans">
                    {personal_info.email && <span>{personal_info.email}</span>}
                    {personal_info.phone && <span>• {personal_info.phone}</span>}
                    {personal_info.location && <span>• {personal_info.location}</span>}
                    {personal_info.linkedin_url && <span>• LinkedIn</span>}
                    {personal_info.portfolio_url && <span>• Portfolio</span>}
                </div>
            </div>

            {/* Summary */}
            {personal_info.summary && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-2">Professional Summary</h2>
                    <p className="text-sm leading-relaxed text-justify">{personal_info.summary}</p>
                </div>
            )}

            {/* Experience */}
            {experience.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-4">Experience</h2>
                    <div className="space-y-4">
                        {experience.map(exp => (
                            <div key={exp.id}>
                                <div className="flex justify-between items-baseline font-bold font-sans text-sm">
                                    <span>{exp.title}, {exp.company}</span>
                                    <span className="text-xs text-gray-600 italic">
                                        {exp.start_date} - {exp.current ? "Present" : exp.end_date}
                                    </span>
                                </div>
                                <p className="text-sm mt-1 leading-relaxed text-gray-800">{exp.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Education & Skills in Columns */}
            <div className="grid grid-cols-2 gap-8">
                {education.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-4">Education</h2>
                        <div className="space-y-3">
                            {education.map(edu => (
                                <div key={edu.id}>
                                    <div className="font-bold text-sm font-sans">{edu.degree}</div>
                                    <div className="text-sm font-sans italic">{edu.school}</div>
                                    <div className="text-xs text-gray-500">{edu.year}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {skills.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-4">Core Competencies</h2>
                        <div className="space-y-2">
                            {skills.map((cat, i) => (
                                <div key={i} className="text-sm">
                                    <span className="font-bold underline text-xs uppercase block mb-0.5">{cat.category}</span>
                                    <span className="text-gray-800 font-sans">{cat.skills.join(", ")}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Projects */}
            {projects.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-4">Key Projects</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {projects.map(proj => (
                            <div key={proj.id} className="text-sm">
                                <div className="font-bold font-sans mb-0.5">{proj.name}</div>
                                <p className="text-gray-700 leading-snug mb-1">{proj.description}</p>
                                <div className="text-xs italic text-gray-500 font-sans">{proj.technologies.join(", ")}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
