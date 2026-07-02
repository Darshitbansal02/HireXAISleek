"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, Sparkles, ArrowRight, RefreshCw, Scan, BrainCircuit, LineChart, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  match_score: number;
  ats_compatibility: "Low" | "Medium" | "High";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  improvements: string[];
}

export function ResumeDoctor() {
  const [resumeText, setResumeText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [loadedFromProfile, setLoadedFromProfile] = useState(false);

  // Animation State
  const [processStep, setProcessStep] = useState<"idle" | "scanning" | "analyzing" | "weakpoints" | "finalizing">("idle");

  // Check for analyze trigger on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('analyze') === 'true') {
      loadAndAnalyze();
    }
  }, []);

  const loadAndAnalyze = async () => {
    try {
      setUploading(true);
      const data = await apiClient.extractResumeText();
      if (data.text) {
        setResumeText(data.text);
        setCurrentFileName(data.fileName || "Resume from Profile");
        setLoadedFromProfile(true);

        try {
          const profile = await apiClient.getProfile();
          if (profile && profile.resume_analysis) {
            setResult(profile.resume_analysis);
            return;
          }
        } catch (e) {
          console.warn("Failed to check existing analysis", e);
        }

        await analyzeText(data.text);
      }
    } catch (error) {
      console.error("Failed to extract resume text:", error);
      setError("Failed to load resume. Please ensure you have uploaded a resume in your profile.");
    } finally {
      setUploading(false);
    }
  };

  const analyzeText = async (text: string) => {
    setAnalyzing(true);
    setProcessStep("scanning");
    setError("");
    setResult(null);

    // Simulate steps for UI effect
    setTimeout(() => setProcessStep("analyzing"), 1500);
    setTimeout(() => setProcessStep("weakpoints"), 3500);
    setTimeout(() => setProcessStep("finalizing"), 5000);

    try {
      const response = await apiClient.analyzeResume(text);

      try {
        let jsonStr = response.analysis;
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/\n?```/g, "").trim();
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) throw new Error("No valid JSON object found");
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch (e) {
          // Basic repair attempt
          if (!jsonStr.endsWith('}')) jsonStr += '}';
          try { parsed = JSON.parse(jsonStr); } catch (e2) { throw new Error("Could not parse AI response."); }
        }

        if (!parsed.match_score) throw new Error("Missing score in analysis");

        // Ensure arrays
        parsed.strengths = parsed.strengths || [];
        parsed.weaknesses = parsed.weaknesses || [];
        parsed.missing_keywords = parsed.missing_keywords || [];
        parsed.improvements = parsed.improvements || [];

        // Wait for animation to finish "finalizing" before showing result
        setTimeout(() => {
          setResult(parsed);
          setAnalyzing(false);
          setProcessStep("idle");
        }, 6500); // Ensure total time covers the animation steps

      } catch (parseError: any) {
        setError("Failed to parse analysis. Please try again.");
        setAnalyzing(false);
        setProcessStep("idle");
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze resume");
      setAnalyzing(false);
      setProcessStep("idle");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(pdf|docx|txt)$/i)) {
      setError("Please upload a PDF, DOCX, or TXT file");
      return;
    }
    try {
      setUploading(true);
      setError("");
      await apiClient.uploadResume(file);
      const extractionData = await apiClient.extractResumeText();
      if (extractionData.text) {
        setResumeText(extractionData.text);
        setCurrentFileName(file.name);
        setLoadedFromProfile(false);
        setResult(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = () => {
    if (!resumeText.trim()) {
      loadAndAnalyze();
    } else {
      analyzeText(resumeText);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4 mb-10">
        <h2 className="text-4xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-primary to-indigo-600">
            Smart Resume Analysis
          </span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Our advanced AI scans your resume against millions of data points to optimize your hiring potential.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Panel: Input */}
        <Card className={cn("border-border/50 shadow-lg transition-all duration-500", analyzing ? "opacity-60 scale-[0.98] blur-[1px]" : "opacity-100")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Resume Content
            </CardTitle>
            <CardDescription>
              Upload or paste your resume to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-xl p-8 text-center hover:bg-primary/10 transition-colors cursor-pointer relative group">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading || analyzing}
              />
              <div className="pointer-events-none relative z-20">
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 text-primary mb-3 animate-spin" />
                    <p className="text-sm font-semibold">Processing File...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-base font-semibold">Click to Upload Resume</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {currentFileName && (
              <div className="flex items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium truncate">{currentFileName}</span>
                </div>
                {loadedFromProfile && !analyzing && (
                  <Button variant="ghost" size="icon" onClick={loadAndAnalyze} className="h-6 w-6">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
              <div className="relative flex justify-center text-xs uppercase font-medium"><span className="bg-card px-2 text-muted-foreground">OR PASTE TEXT</span></div>
            </div>

            <Textarea
              placeholder="Paste your resume content here..."
              className="min-h-[250px] font-mono text-sm bg-muted/10 resize-none focus-visible:ring-primary/20"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              disabled={analyzing}
            />

            <Button
              className={cn("w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 transition-all", analyzing ? "bg-muted text-muted-foreground" : "bg-primary hover:bg-primary/90 hover:scale-[1.02]")}
              onClick={handleAnalyze}
              disabled={analyzing || !resumeText.trim()}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analysis in Progress...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Full Analysis
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-3 border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Result or Processing */}
        <div className="relative min-h-[600px] h-full">
          <AnimatePresence mode="wait">

            {analyzing ? (
              /* PROCESSING STATE - WHITE THEME ANALYZING UI */
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                className="absolute inset-0 rounded-2xl overflow-hidden border border-border/10 bg-white shadow-2xl flex flex-col items-center justify-center z-20"
              >
                {/* CSS Grid Pattern Background */}
                <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                  }}
                />

                {/* Animated Orbs */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100 rounded-full blur-[120px] animate-pulse delay-700" />

                <div className="relative z-10 w-full max-w-md px-8 text-center space-y-8">

                  {/* Icon Animation */}
                  <div className="relative mx-auto h-24 w-24">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-[spin_3s_linear_infinite]" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite]" />

                    <div className="absolute inset-0 flex items-center justify-center bg-white rounded-full shadow-lg">
                      {processStep === "scanning" && <Scan className="h-8 w-8 text-primary animate-pulse" />}
                      {processStep === "analyzing" && <BrainCircuit className="h-8 w-8 text-indigo-500 animate-pulse" />}
                      {processStep === "weakpoints" && <Search className="h-8 w-8 text-amber-500 animate-pulse" />}
                      {processStep === "finalizing" && <LineChart className="h-8 w-8 text-green-500 animate-pulse" />}
                    </div>
                  </div>

                  {/* Status Text with typing effect */}
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                      {processStep === "scanning" && "Scanning Resume..."}
                      {processStep === "analyzing" && "Analyzing Skills..."}
                      {processStep === "weakpoints" && "Identifying Weak Points..."}
                      {processStep === "finalizing" && "Compiling Report..."}
                    </h3>
                    <p className="text-slate-500 text-sm h-6 font-medium">
                      {processStep === "scanning" && "Extracting structure and keywords"}
                      {processStep === "analyzing" && "Matching against market standards"}
                      {processStep === "weakpoints" && "Finding areas for improvement and gaps"}
                      {processStep === "finalizing" && "Generating personalized insights"}
                    </p>
                  </div>

                  {/* Progress Bar - Custom White/Blue */}
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                        initial={{ width: "0%" }}
                        animate={{
                          width: processStep === "scanning" ? "25%" :
                            processStep === "analyzing" ? "50%" :
                              processStep === "weakpoints" ? "75%" : "95%"
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold tracking-widest px-1">
                      <span className={processStep !== "idle" ? "text-primary" : ""}>Scan</span>
                      <span className={processStep === "weakpoints" ? "text-primary" : ""}>Weak Points</span>
                      <span className={processStep === "finalizing" ? "text-primary" : ""}>Done</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : result ? (
              /* RESULT STATE */
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full relative"
              >
                <Card className="h-full border-border/50 shadow-xl overflow-hidden bg-white/50 dark:bg-card/50 backdrop-blur-md">
                  <CardHeader className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">Analysis Report</CardTitle>
                        <CardDescription>Generated just now</CardDescription>
                      </div>
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        Verified by AI
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
                    <div className="p-6 space-y-8">
                      {/* Overall Score with Circular Indicator */}
                      <div className="flex items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10">
                        <div className="relative h-20 w-20 flex items-center justify-center">
                          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-muted/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                            <path className="text-primary" strokeDasharray={`${result.match_score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          </svg>
                          <span className="absolute text-xl font-bold text-primary">{result.match_score}</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">Resume Score</h4>
                          <p className="text-sm text-muted-foreground mb-2">ATS Compatibility: <strong className="text-foreground">{result.ats_compatibility}</strong></p>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">{result.summary}</p>
                        </div>
                      </div>

                      {/* Strengths */}
                      <div>
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-green-500" /> Strong Points
                        </h4>
                        <div className="grid gap-3">
                          {result.strengths.map((item, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                              <p className="text-sm text-foreground/80">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weak Points (Specific Request to Show These) */}
                      {result.weaknesses.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-red-500/80">
                            <AlertCircle className="h-4 w-4 text-red-500" /> Weak Points to Fix
                          </h4>
                          <div className="grid gap-3">
                            {result.weaknesses.map((item, i) => (
                              <div key={i} className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <p className="text-sm text-foreground/80">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Improvements */}
                      <div>
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                          <Sparkles className="h-4 w-4 text-primary" /> Recommended Action Plan
                        </h4>
                        <div className="grid gap-3">
                          {result.improvements.map((item, i) => (
                            <div key={i} className="flex gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10 shadow-sm">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                {i + 1}
                              </div>
                              <p className="text-sm text-foreground/90 font-medium">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* EMPTY STATE */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full rounded-2xl border-2 border-dashed border-border/60 bg-muted/5 flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="h-20 w-20 bg-gradient-to-br from-primary/10 to-blue-600/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Ready to Analyze</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                  Upload your resume on the left to unlock detailed insights and AI-powered optimization tips.
                </p>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="px-3 py-1 bg-white dark:bg-slate-900 border-border shadow-sm">ATS Check</Badge>
                  <Badge variant="secondary" className="px-3 py-1 bg-white dark:bg-slate-900 border-border shadow-sm">Keyword Scan</Badge>
                  <Badge variant="secondary" className="px-3 py-1 bg-white dark:bg-slate-900 border-border shadow-sm">Scoring</Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
