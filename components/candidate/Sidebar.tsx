"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    LayoutDashboard,
    Briefcase,
    Heart,
    FileText,
    User,
    LogOut,
    Sparkles,
    ClipboardList
} from "lucide-react";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: "overview" | "jobs" | "saved" | "applications" | "resume" | "profile") => void;
    onLogout: () => void;
    className?: string; // for hydration/styling
}

export function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
    const mainNavItems = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "jobs", label: "All Jobs", icon: Briefcase },
        { id: "saved", label: "Saved Jobs", icon: Heart },
        { id: "applications", label: "Applications", icon: ClipboardList },
    ] as const;

    const toolNavItems = [
        { id: "resume_builder", label: "Resume Builder", icon: Sparkles, isLink: true, href: "/candidate/builder" },
        { id: "resume", label: "Resume Doctor", icon: FileText },
    ] as const;

    return (
        <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-border/50">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                    <img src="/hirexai_logo_premium.png" alt="Logo" className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-foreground">HireXAI</h1>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Candidate</p>
                </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 py-2">
                <div className="space-y-1 mb-8">
                    {mainNavItems.map((item) => (
                        <Button
                            key={item.id}
                            variant="ghost"
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full justify-start gap-3 h-11 px-4 text-sm font-medium transition-all duration-200 rounded-xl ${activeTab === item.id
                                    ? "bg-blue-600/10 text-blue-600 shadow-sm border border-blue-600/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Button>
                    ))}
                </div>

                <div className="space-y-1">
                    <p className="px-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Tools</p>
                    {/* Resume Builder (External Link Logic handled by Parent or Router) */}
                    {/* For now we treat it as a tab switching or direct link. The parent usually handles router.push if it's a separate page. 
                        But strictly following "Sidebar" logic, let's keep it consistent. 
                        Wait, the user wants "Resume Builder" in the sidebar. The previous code pushed to router. 
                        I will let the parent handle the click if it's a link.
                    */}
                    <Button
                        variant="ghost"
                        onClick={() => window.location.href = "/candidate/builder"} // Direct navigation
                        className="w-full justify-start gap-3 h-11 px-4 text-sm font-medium text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                    >
                        <Sparkles className="h-4 w-4" />
                        Resume Builder
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab("resume")}
                        className={`w-full justify-start gap-3 h-11 px-4 text-sm font-medium transition-all duration-200 rounded-xl ${activeTab === "resume"
                                ? "bg-blue-600/10 text-blue-600 shadow-sm border border-blue-600/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                    >
                        <FileText className="h-4 w-4" />
                        Resume Doctor
                    </Button>
                </div>

                <div className="space-y-1 mt-8">
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab("profile")}
                        className={`w-full justify-start gap-3 h-11 px-4 text-sm font-medium transition-all duration-200 rounded-xl ${activeTab === "profile"
                                ? "bg-blue-600/10 text-blue-600 shadow-sm border border-blue-600/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                    >
                        <User className="h-4 w-4" />
                        My Profile
                    </Button>
                </div>
            </ScrollArea>

            {/* User / Logout */}
            <div className="p-4 border-t border-border/40">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-12"
                    onClick={onLogout}
                >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                </Button>
            </div>
        </div>
    );
}
