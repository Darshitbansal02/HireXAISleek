import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface TestBuilderLayoutProps {
    sidebar: React.ReactNode;
    editor: React.ReactNode;
}

export default function TestBuilderLayout({ sidebar, editor }: TestBuilderLayoutProps) {
    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* Sidebar - Fixed Width */}
            <div className="w-80 border-r bg-muted/10 flex flex-col shrink-0">
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        {sidebar}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Editor Area - Flexible */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                <ScrollArea className="flex-1">
                    <div className="p-6 max-w-5xl mx-auto w-full">
                        {editor}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
