import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Experience {
    title: string;
    company: string;
    start_date: string;
    end_date?: string;
    description?: string;
    current: boolean;
}

interface ExperienceListProps {
    experiences: Experience[];
    onDelete?: (index: number) => void;
    variant?: "card" | "timeline";
}

export function ExperienceList({ experiences, onDelete, variant = "card" }: ExperienceListProps) {
    if (!experiences || experiences.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No experience listed.</p>;
    }

    if (variant === "timeline") {
        return (
            <div className="space-y-6">
                {experiences.map((exp, i) => (
                    <div key={i} className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0 last:border-l-0">
                        <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-background border-2 border-primary ring-4 ring-background" />
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1">
                            <h4 className="font-semibold text-base text-foreground">{exp.title}</h4>
                            <Badge variant="outline" className="w-fit text-xs font-normal text-muted-foreground bg-muted/30">
                                {exp.start_date} - {exp.current ? "Present" : exp.end_date}
                            </Badge>
                        </div>
                        <p className="text-primary font-medium text-sm mb-2">{exp.company}</p>
                        {exp.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{exp.description}</p>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {experiences.map((exp, index) => (
                <div key={index} className="p-4 border rounded-lg relative group bg-card">
                    {onDelete && (
                        <button
                            onClick={() => onDelete(index)}
                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <h4 className="font-semibold">{exp.title}</h4>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {exp.start_date} - {exp.current ? "Present" : exp.end_date}
                    </p>
                    {exp.description && (
                        <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                    )}
                </div>
            ))}
        </div>
    );
}
