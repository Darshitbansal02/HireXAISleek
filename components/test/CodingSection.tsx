import React, { useState } from 'react';
import MonacoEditor from './MonacoEditor';
import RunOutputPanel from './RunOutputPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sun, Moon, ZoomIn, ZoomOut, RotateCcw, Type } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CodingSectionProps {
    code: string;
    setCode: (code: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
    isRunning: boolean;
    runResults: any;
    runError: string | null;
}

export default function CodingSection({
    code,
    setCode,
    language,
    setLanguage,
    isRunning,
    runResults,
    runError
}: CodingSectionProps) {
    const [activeTab, setActiveTab] = useState("code");
    const [fontSize, setFontSize] = useState(14);
    const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");

    // Switch to output tab automatically when running
    React.useEffect(() => {
        if (isRunning || runResults || runError) {
            setActiveTab("output");
        }
    }, [isRunning, runResults, runError]);

    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 24));
    const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 10));
    const toggleTheme = () => setTheme(prev => prev === "vs-dark" ? "light" : "vs-dark");

    return (
        <div className="h-full flex flex-col bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b px-4 bg-muted/20 flex justify-between items-center">
                    <TabsList className="h-10 bg-transparent p-0">
                        <TabsTrigger
                            value="code"
                            className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4"
                        >
                            Code
                        </TabsTrigger>
                        <TabsTrigger
                            value="output"
                            className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4"
                        >
                            Output
                        </TabsTrigger>
                    </TabsList>

                    {/* Editor Controls (Visible only on Code tab) */}
                    {activeTab === "code" && (
                        <div className="flex items-center gap-1 pr-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                                            <ZoomOut className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Zoom Out</TooltipContent>
                                </Tooltip>
                                <div className="text-xs font-mono w-8 text-center">{fontSize}px</div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                                            <ZoomIn className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Zoom In</TooltipContent>
                                </Tooltip>
                                <div className="w-px h-4 bg-border mx-2" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
                                            {theme === 'vs-dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Toggle Theme</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>

                <div className="flex-1 relative overflow-hidden">
                    <TabsContent value="code" className="h-full m-0 p-0 absolute inset-0">
                        <MonacoEditor
                            language={language}
                            setLanguage={setLanguage}
                            code={code}
                            setCode={setCode}
                            allowCopy={false} // Strict proctoring: No copy/paste
                            theme={theme}
                            fontSize={fontSize}
                        />
                    </TabsContent>

                    <TabsContent value="output" className="h-full m-0 p-0 absolute inset-0 bg-background">
                        <RunOutputPanel
                            isRunning={isRunning}
                            results={runResults}
                            error={runError}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
