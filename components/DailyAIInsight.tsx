import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, Lightbulb } from "lucide-react";

export function DailyAIInsight() {
    const insights = [
        {
            title: "Market Trend Alert",
            desc: "Python developers with AI expertise are seeing a 15% salary increase this month.",
            icon: TrendingUp,
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            title: "Resume Tip",
            desc: "Adding quantifiable metrics to your 'Experience' section increases callback rates by 40%.",
            icon: Lightbulb,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Skill Focus",
            desc: "Cloud architecture is the #1 most requested skill for Senior Engineers right now.",
            icon: Sparkles,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    // Deterministic "random" logic based on day of year to avoid hydration mismatch
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const insight = insights[dayOfYear % insights.length];

    return (
        <div className="relative group h-full">
            {/* Restored Purple Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

            {/* Card Content - h-full removed to fit content naturally if needed, but styling adjusted to look premium */}
            <Card className="relative border-none bg-white dark:bg-card h-full">
                <CardContent className="p-6 flex items-start gap-4">
                    <div className={`p-3 rounded-xl shrink-0 ${insight.bg} ${insight.color}`}>
                        <insight.icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base flex items-center gap-2 mb-1">
                            Daily AI Insight
                            <span className="text-[10px] bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text font-bold uppercase tracking-wider border border-purple-200 dark:border-purple-800 rounded px-1.5 py-0.5">
                                BETA
                            </span>
                        </h4>
                        <p className="text-sm font-bold text-foreground mb-1">{insight.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {insight.desc}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
