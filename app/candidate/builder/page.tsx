"use client";

import { useEffect } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { BuilderWizard } from "@/components/resume-builder/BuilderWizard";
import { BuilderPreview } from "@/components/resume-builder/BuilderPreview";
import { Loader2 } from "lucide-react";

export default function ResumeBuilderPage() {
    const { fetchResume, isLoading } = useResumeStore();

    useEffect(() => {
        fetchResume();
    }, [fetchResume]);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg">Loading your resume...</span>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Top Bar - could be added here if needed, or part of layout */}

            <div className="flex-1 flex">
                {/* Left Panel: Wizard */}
                <div className="w-1/2 p-6 flex flex-col border-r bg-white overflow-y-auto">
                    <BuilderWizard />
                </div>

                {/* Right Panel: Preview */}
                <div className="w-1/2 bg-gray-100 p-8 overflow-y-auto flex justify-center">
                    <div className="max-w-[210mm] w-full shadow-2xl">
                        <BuilderPreview />
                    </div>
                </div>
            </div>
        </div>
    );
}
