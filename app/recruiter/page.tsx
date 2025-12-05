"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatsCard } from "@/components/StatsCard";
import { CandidateCard } from "@/components/CandidateCard";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { AIChatbox } from "@/components/AIChatbox";
import Link from "next/link";
import { Search, Users, Briefcase, TrendingUp, Settings, LogOut, Sparkles, AlertCircle, BookmarkCheck, FileText, Video, Trash } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { MyJobsSection } from "@/components/MyJobsSection";
import { CandidateProfileModal } from "@/components/CandidateProfileModal";
import ShortlistedCandidatesSection from "./shortlisted/page";
import { NotificationBell } from "@/components/NotificationBell";
import { RecruiterInterviewsSection } from "@/components/RecruiterInterviewsSection";


export default function RecruiterDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"search" | "post" | "myjobs" | "analytics" | "shortlisted" | "assessments" | "interviews">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobExperience, setJobExperience] = useState("0");
  const [jobSkills, setJobSkills] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobType, setJobType] = useState("Full-time");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- FIXED STATS STATE ---
  const [stats, setStats] = useState({
    active_jobs: 0,
    total_candidates: 0,
    total_applications: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // My Jobs state
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Assessments State
  const [myTests, setMyTests] = useState<any[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);

  // Profile Modal State
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleViewProfile = (candidateId: number) => {
    setSelectedCandidateId(candidateId);
    setIsProfileModalOpen(true);
  };


  // Protect route
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "recruiter")) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Fetch stats
  useEffect(() => {
    if (isAuthenticated && user?.role === "recruiter") {
      fetchStats();
    }
  }, [isAuthenticated, user]);

  // Fetch jobs when switching to "My Jobs"
  useEffect(() => {
    if (activeTab === "myjobs" && isAuthenticated) {
      fetchMyJobs();
    }
  }, [activeTab, isAuthenticated]);

  // Fetch tests when switching to "Assessments"
  useEffect(() => {
    if (activeTab === "assessments" && isAuthenticated) {
      fetchMyTests();
    }
  }, [activeTab, isAuthenticated]);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(false);

    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("recruiter_stats_cache");
      if (cached) {
        try {
          setStats(JSON.parse(cached));
          setStatsLoading(false);
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    }

    try {
      const data = await apiClient.getRecruiterStats();
      const safeStats = {
        active_jobs: data?.active_jobs ?? 0,
        total_candidates: data?.total_candidates ?? 0,
        total_applications: data?.total_applications ?? 0
      };
      setStats(safeStats);
      if (typeof window !== "undefined") {
        localStorage.setItem("recruiter_stats_cache", JSON.stringify(safeStats));
      }
    } catch (err) {
      console.error("Failed to fetch recruiter stats", err);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  };

  const handlePostJob = async () => {
    if (!jobTitle.trim() || !jobDescription.trim() || !jobLocation.trim() || !jobSkills.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await apiClient.postJob({
        title: jobTitle,
        description: jobDescription,
        location: jobLocation,
        min_experience: parseInt(jobExperience) || 0,
        skills: jobSkills,
        company: jobCompany || "Hiring Company",
        type: jobType
      });

      setSuccess("Job posted successfully!");
      setJobTitle("");
      setJobDescription("");
      setJobLocation("");
      setJobExperience("0");
      setJobSkills("");
      setJobCompany("");
      setJobType("Full-time");
      fetchStats();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to post job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!jobTitle.trim()) {
      setError("Please enter a job title first");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const data = await apiClient.generateJobDescription({
        title: jobTitle,
        company: jobCompany,
        location: jobLocation,
        experience: jobExperience,
        skills: jobSkills,
        type: jobType
      });

      // Handle JSON response
      if (data.overview) {
        // Update form fields with AI-enhanced data
        if (data.title) setJobTitle(data.title);
        if (data.company) setJobCompany(data.company);
        if (data.location) setJobLocation(data.location);
        if (data.experience_required) setJobExperience(data.experience_required.replace(/[^0-9]/g, '') || "0");
        if (data.employment_type) setJobType(data.employment_type);

        // Construct formatted description
        const formattedDesc = [
          data.overview,
          "\nKey Responsibilities:",
          ...(data.responsibilities?.map((r: string) => `• ${r}`) || []),
          "\nRequired Qualifications:",
          ...(data.required_qualifications?.map((q: string) => `• ${q}`) || []),
          "\nPreferred Qualifications:",
          ...(data.preferred_qualifications?.map((q: string) => `• ${q}`) || []),
          "\nBenefits:",
          ...(data.benefits?.map((b: string) => `• ${b}`) || []),
          `\n${data.company_statement || ""}`
        ].join("\n");

        setJobDescription(formattedDesc);
      } else {
        // Fallback if JSON parsing failed but text returned
        setJobDescription(data.description || "AI-generated job description...");
      }

    } catch (err: any) {
      setError(err.message || "Failed to generate description");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;

    setIsSubmitting(true);
    setError("");
    try {
      await apiClient.deleteJob(jobId);
      setSuccess("Job deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
      fetchMyJobs();
      fetchStats();
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setApplications([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (applicationId: number, status: string) => {
    setIsUpdatingStatus(true);
    try {
      await apiClient.updateApplicationStatus(applicationId, status);
      setApplications(prev => prev.map(app =>
        app.id === applicationId ? { ...app, status } : app
      ));
      setSuccess("Status updated successfully");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const fetchMyJobs = async () => {
    setJobsLoading(true);
    setError("");
    try {
      const data = await apiClient.getMyJobs();
      setMyJobs(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load jobs");
    } finally {
      setJobsLoading(false);
    }
  };

  const handleViewApplications = async (jobId: number) => {
    setSelectedJobId(jobId);
    setApplicationsLoading(true);
    setError("");
    try {
      const data = await apiClient.getJobApplications(jobId);
      setApplications(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load applications");
    } finally {
      setApplicationsLoading(false);
    }
  };

  const fetchMyTests = async () => {
    setTestsLoading(true);
    try {
      const data = await apiClient.getTests();
      setMyTests(data || []);
    } catch (err) {
      console.error("Failed to fetch tests", err);
    } finally {
      setTestsLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this assessment? This action cannot be undone.")) return;

    try {
      await apiClient.deleteTest(testId);
      setMyTests(prev => prev.filter(t => t.id !== testId));
      setSuccess("Assessment deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Failed to delete test", err);
      setError(err.message || "Failed to delete assessment");
    }
  };

  // --- FIX STARTS HERE (The handleSearch was broken in your snippet) ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const results = await apiClient.searchCandidates(searchQuery);
      console.log("Search Results from API:", results); // DEBUG LOG
      setSearchResults(Array.isArray(results) ? results : []);

      if (Array.isArray(results) && results.length === 0) {
        setSuccess("No candidates found matching your criteria.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "Failed to search candidates");
      setSearchResults([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-40 border-b border-border/40 glass-strong backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <img src="/hirexai_logo_premium.png" alt="Logo" className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              HireXAI
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline-block">{user?.email}</span>
            <NotificationBell />
            <ThemeToggle />
            <Button variant="ghost" size="icon" data-testid="button-settings" className="hover:bg-primary/10">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { logout(); router.push("/"); }} data-testid="button-logout" className="hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Recruiter Dashboard</h2>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">Find the perfect candidates with AI</p>
            {statsError && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium border border-yellow-200">
                <AlertCircle className="h-3 w-3" />
                Offline Mode: Using cached stats
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Active Jobs"
            value={statsLoading && stats.active_jobs === 0 ? "..." : stats?.active_jobs?.toString() ?? "0"}
            icon={Briefcase}
            trend={{ value: "Active", isPositive: true }}
          />
          <StatsCard
            title="Total Candidates"
            value={statsLoading && stats.total_candidates === 0 ? "..." : stats?.total_candidates?.toString() ?? "0"}
            icon={Users}
            trend={{ value: "Database", isPositive: true }}
          />
          <StatsCard
            title="Total Applications"
            value={statsLoading && stats.total_applications === 0 ? "..." : stats?.total_applications?.toString() ?? "0"}
            icon={TrendingUp}
            trend={{ value: "Received", isPositive: true }}
          />
        </div>

        {/* Enhanced Tabs Scroller */}
        <div className="relative mb-8 group">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none md:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none md:hidden" />

          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-1">
            {[
              { id: "search", label: "Search Candidates", icon: Search },
              { id: "post", label: "Post Job", icon: Briefcase },
              { id: "myjobs", label: "My Jobs", icon: Briefcase },
              { id: "shortlisted", label: "Shortlisted", icon: BookmarkCheck },
              { id: "assessments", label: "Assessments", icon: FileText },
              { id: "interviews", label: "Interviews", icon: Video },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id as any)}
                data-testid={`tab-${tab.id}`}
                className={`snap-start flex-shrink-0 transition-all duration-300 ${activeTab === tab.id
                  ? "shadow-md shadow-primary/20 scale-105"
                  : "hover:bg-primary/5 hover:border-primary/30"
                  }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            ))}

            <div className="w-px h-8 bg-border mx-2 hidden md:block" />

            <Button
              variant="outline"
              onClick={() => router.push("/recruiter/tests/create")}
              className="snap-start flex-shrink-0 border-primary/50 text-primary hover:bg-primary/10 hover:shadow-sm hover:shadow-primary/10"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-sm">
            {success}
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-6">
            <Card className="border-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Semantic Search
                </CardTitle>
                <CardDescription>
                  Search candidates using natural language • Only shows profiles with 100% completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Find senior React developers with AWS experience in California"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-semantic-search"
                    disabled={isSubmitting}
                  />
                  <Button
                    data-testid="button-search"
                    onClick={handleSearch}
                    disabled={isSubmitting}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Searching..." : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {searchResults.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={{
                    id: candidate.id,
                    full_name: candidate.full_name || "Candidate",
                    headline: candidate.headline || "Job Seeker",
                    location: candidate.location || "Unknown",
                    experience_years: candidate.experience_years || 0,
                    similarity: candidate.similarity || 0,
                    skills: Array.isArray(candidate.skills)
                      ? candidate.skills.slice(0, 5)
                      : (candidate.skills ? candidate.skills.split(',').slice(0, 5) : []),
                    avatar_url: undefined // Add if available
                  }}
                  onViewProfile={handleViewProfile}
                />

              ))}
            </div>

            {searchResults.length === 0 && !isSubmitting && (
              <Card className="border-premium">
                <CardHeader>
                  <CardTitle>Candidate Results</CardTitle>
                  <CardDescription>
                    Top matches based on your search
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    {searchQuery ? "No candidates found matching your criteria." : "Enter a search query to see candidate results"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "post" && (
          <Card className="max-w-4xl mx-auto border-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Post a New Job
              </CardTitle>
              <CardDescription>
                Create a job posting with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Title *</label>
                  <Input
                    placeholder="e.g., Senior Full Stack Developer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    data-testid="input-job-title"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Input
                    placeholder="e.g., Tech Corp"
                    value={jobCompany}
                    onChange={(e) => setJobCompany(e.target.value)}
                    data-testid="input-job-company"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location *</label>
                  <Input
                    placeholder="e.g., Remote, San Francisco"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    data-testid="input-job-location"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Experience (years)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={jobExperience}
                    onChange={(e) => setJobExperience(e.target.value)}
                    data-testid="input-job-experience"
                    disabled={isSubmitting}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Type</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    data-testid="select-job-type"
                    disabled={isSubmitting}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Skills *</label>
                <Input
                  placeholder="e.g., Python, React, AWS"
                  value={jobSkills}
                  onChange={(e) => setJobSkills(e.target.value)}
                  data-testid="input-job-skills"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Separate multiple skills with commas</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Job Description *</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIGenerate}
                    data-testid="button-ai-generate"
                    disabled={isSubmitting}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
                <Textarea
                  placeholder="Describe the role, responsibilities, and requirements..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={12}
                  data-testid="textarea-job-description"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  data-testid="button-post-job"
                  onClick={handlePostJob}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Posting..." : "Post Job"}
                </Button>
                <Button
                  variant="outline"
                  data-testid="button-save-draft"
                  disabled={isSubmitting}
                >
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "myjobs" && (
          <MyJobsSection
            jobs={myJobs}
            loading={jobsLoading}
            selectedJobId={selectedJobId}
            applications={applications}
            applicationsLoading={applicationsLoading}
            onViewApplications={handleViewApplications}
            onDeleteJob={handleDeleteJob}
            isDeleting={isSubmitting}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={isUpdatingStatus}
            onViewProfile={handleViewProfile}
          />
        )}

        {activeTab === "shortlisted" && (
          <ShortlistedCandidatesSection />
        )}

        {activeTab === "assessments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">My Assessments</h3>
              <Button onClick={() => router.push("/recruiter/tests/create")}>
                <FileText className="mr-2 h-4 w-4" /> Create New Assessment
              </Button>
            </div>

            {testsLoading ? (
              <div className="text-center py-8">Loading assessments...</div>
            ) : myTests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No assessments created yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTests.map((test) => (
                  <Card key={test.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <CardTitle>{test.title}</CardTitle>
                      <CardDescription>Duration: {test.duration_minutes} mins</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-muted-foreground">
                          Created: {new Date(test.created_at).toLocaleDateString()}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => router.push(`/recruiter/tests/${test.id}/results`)}>
                          View Results
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteTest(test.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "interviews" && (
          <RecruiterInterviewsSection />
        )}


      </div>

      <AIChatbox />
      <CandidateProfileModal
        candidateId={selectedCandidateId}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        similarityScore={
          activeTab === 'search' && selectedCandidateId
            ? searchResults.find(c => c.id === selectedCandidateId)?.similarity
            : undefined
        }
        jobId={activeTab === 'myjobs' ? selectedJobId || undefined : undefined}
      />
    </div >

  );
}
