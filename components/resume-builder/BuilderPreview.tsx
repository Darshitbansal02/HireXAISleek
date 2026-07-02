import { useResumeStore } from "@/lib/store/resume-store";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ProfessionalTemplate } from "./templates/ProfessionalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";

export function BuilderPreview() {
    const { resume, selectedTemplate } = useResumeStore();

    if (!resume.personal_info.full_name && resume.experience.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-white border shadow-sm aspect-[210/297]">
                <p>Start typing to see your resume preview...</p>
            </div>
        );
    }

    return (
        <div id="resume-preview" className="origin-top scale-[0.6] md:scale-100 transition-transform duration-300">
            {selectedTemplate === "modern" && <ModernTemplate resume={resume} />}
            {selectedTemplate === "professional" && <ProfessionalTemplate resume={resume} />}
            {selectedTemplate === "creative" && <CreativeTemplate resume={resume} />}
            {!selectedTemplate && <ModernTemplate resume={resume} />}
        </div>
    );
}
