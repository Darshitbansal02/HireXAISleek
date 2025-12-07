import { GraduationCap, X } from "lucide-react";

interface Education {
    degree: string;
    school: string;
    year: string;
    field: string;
}

interface EducationListProps {
    education: Education[];
    onDelete?: (index: number) => void;
    variant?: "default" | "view";
}

export function EducationList({ education, onDelete, variant = "default" }: EducationListProps) {
    if (!education || education.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No education listed.</p>;
    }

    if (variant === "view") {
        return (
            <div className="grid sm:grid-cols-2 gap-4">
                {education.map((edu, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">{edu.school}</h4>
                                <p className="text-sm text-muted-foreground font-medium">{edu.degree}</p>
                                <p className="text-xs text-muted-foreground mt-1">{edu.field}</p>
                                <p className="text-xs text-muted-foreground mt-2 bg-muted inline-block px-2 py-0.5 rounded-full">{edu.year}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {education.map((edu, index) => (
                <div key={index} className="p-4 border rounded-lg relative group bg-card">
                    {onDelete && (
                        <button
                            onClick={() => onDelete(index)}
                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <h4 className="font-semibold">{edu.school}</h4>
                    <p className="text-sm text-muted-foreground">{edu.degree} in {edu.field}</p>
                    <p className="text-xs text-muted-foreground mt-1">{edu.year}</p>
                </div>
            ))}
        </div>
    );
}
