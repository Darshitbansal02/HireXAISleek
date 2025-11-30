"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";

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
      // 1. Extract text from backend
      const data = await apiClient.extractResumeText();
      if (data.text) {
        setResumeText(data.text);
        setCurrentFileName(data.fileName || "Resume from Profile");
        setLoadedFromProfile(true);

        // Check if analysis already exists in profile
        try {
          const profile = await apiClient.getProfile();
          if (profile && profile.resume_analysis) {
            setResult(profile.resume_analysis);
            return; // Skip re-analysis if already exists
          }
        } catch (e) {
          console.warn("Failed to check existing analysis", e);
        }

        // 2. Trigger analysis if no existing analysis
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
    setError("");
    setResult(null);

    try {
      const response = await apiClient.analyzeResume(text);

      try {
        let jsonStr = response.analysis;

        // 1. Remove markdown code blocks
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/\n?```/g, "").trim();

        // 2. Extract JSON object (everything between first { and last })
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
          throw new Error("No valid JSON object found in response");
        }

        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

        // 3. Try to parse as-is first
        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch (firstError) {
          // 4. If parsing fails, attempt to repair truncated JSON
          console.warn("Initial JSON parse failed, attempting repair...");

          // Count open/close structures
          const openBrackets = (jsonStr.match(/\[/g) || []).length;
          const closeBrackets = (jsonStr.match(/\]/g) || []).length;
          const openQuotes = (jsonStr.match(/"/g) || []).length;

          // If truncated mid-string, close the string
          if (openQuotes % 2 !== 0) {
            jsonStr += '"';
          }

          // Close any unclosed arrays
          for (let i = 0; i < (openBrackets - closeBrackets); i++) {
            jsonStr += ']';
          }

          // Ensure closing brace
          if (!jsonStr.trim().endsWith('}')) {
            jsonStr += '}';
          }

          // Try parsing the repaired JSON
          try {
            parsed = JSON.parse(jsonStr);
          } catch (repairError) {
            // If repair still fails, show original error
            console.error("Failed to parse even after repair:", repairError);
            console.error("Original response:", response.analysis);
            throw new Error(
              `AI response is incomplete or malformed. The AI service may have hit a token limit. Please try with a shorter resume or try again. Technical error: ${(firstError as Error).message}`
            );
          }
        }

        // 5. Validate the parsed object has required fields
        if (!parsed.match_score || !parsed.ats_compatibility) {
          throw new Error("AI response is missing required fields. Please try again.");
        }

        // 6. Ensure arrays exist (even if empty)
        parsed.strengths = parsed.strengths || [];
        parsed.weaknesses = parsed.weaknesses || [];
        parsed.missing_keywords = parsed.missing_keywords || [];
        parsed.improvements = parsed.improvements || [];
        parsed.summary = parsed.summary || "Analysis summary unavailable";

        setResult(parsed);

        // Note: Backend now saves the analysis automatically in analyzeResume endpoint

      } catch (parseError: any) {
        console.error("Failed to parse AI response:", parseError);
        console.error("Raw response:", response.analysis);
        setError(parseError.message || "Failed to parse AI response. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze resume");
    } finally {
      setAnalyzing(false);
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
      const response = await apiClient.uploadResume(file);

      // Immediately trigger extraction for the new file
      const extractionData = await apiClient.extractResumeText();
      if (extractionData.text) {
        setResumeText(extractionData.text);
        setCurrentFileName(file.name);
        setLoadedFromProfile(false);
        // Clear previous result as it's a new file
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
      // If no text, try to load from profile first
      loadAndAnalyze();
    } else {
      analyzeText(resumeText);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
          AI Resume Doctor
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get instant, expert feedback on your resume. Our AI analyzes your profile against current job market trends to help you stand out.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="card-premium h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Resume Content
            </CardTitle>
            <CardDescription>
              Paste your resume text below or upload a file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading}
              />
              <div className="pointer-events-none">
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto text-primary mb-2 animate-spin" />
                    <p className="text-sm font-medium">Uploading and extracting text...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-sm font-medium">Drop your resume here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT supported</p>
                  </>
                )}
              </div>
            </div>

            {/* Status/Source Badge */}
            {currentFileName && (
              <div className="flex items-center justify-between gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Using resume:</p>
                    <p className="text-sm font-medium truncate">{currentFileName}</p>
                  </div>
                </div>
                {loadedFromProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadAndAnalyze}
                    className="flex-shrink-0"
                    title="Refresh from profile"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
              </div>
            </div>

            {/* Resume Text Area */}
            <Textarea
              placeholder="Paste your resume content here..."
              className="min-h-[300px] font-mono text-sm"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />

            <Button
              className="w-full"
              size="lg"
              onClick={handleAnalyze}
              disabled={analyzing || !resumeText.trim()}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Resume
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Score Card */}
              <Card className="card-premium overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Overall Score</h3>
                      <p className="text-sm text-muted-foreground">Based on job market standards</p>
                    </div>
                    <div className="text-4xl font-bold text-primary">
                      {result.match_score}/100
                    </div>
                  </div>
                  <Progress value={result.match_score} className="h-2 mb-4" />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ATS Compatibility:</span>
                    <Badge variant={
                      result.ats_compatibility === "High" ? "default" :
                        result.ats_compatibility === "Medium" ? "secondary" : "destructive"
                    }>
                      {result.ats_compatibility}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Details */}
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle>Detailed Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {result.strengths.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {result.weaknesses.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      Action Plan
                    </h4>
                    <div className="space-y-3">
                      {result.improvements.map((item, i) => (
                        <div key={i} className="p-3 bg-primary/5 rounded-lg text-sm border border-primary/10">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
              <div className="text-center text-muted-foreground">
                <div className="bg-background p-4 rounded-full w-fit mx-auto mb-4 shadow-sm">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Ready to Analyze</h3>
                <p className="text-sm max-w-xs mx-auto">
                  Paste your resume content on the left to get detailed AI feedback and improvement suggestions.
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div >
  );
}
