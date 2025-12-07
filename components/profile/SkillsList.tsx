import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface SkillsListProps {
    skills: string[];
    onRemove?: (skill: string) => void;
    variant?: "default" | "view";
}

export function SkillsList({ skills, onRemove, variant = "default" }: SkillsListProps) {
    if (!skills || skills.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No skills listed.</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => {
                if (variant === "view") {
                    return (
                        <Badge key={index} variant="secondary" className="px-3 py-1.5 text-sm font-normal hover:bg-primary/10 hover:text-primary transition-colors cursor-default">
                            {skill}
                        </Badge>
                    );
                }

                return (
                    <Badge key={index} variant="outline" className="pl-3 pr-1 py-1 flex items-center gap-2">
                        {skill}
                        {onRemove && (
                            <button
                                onClick={() => onRemove(skill)}
                                className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </Badge>
                );
            })}
        </div>
    );
}
