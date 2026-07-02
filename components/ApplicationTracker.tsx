"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Video, MapPin, Loader2, CheckCircle2, Circle, XCircle, Clock, Calendar, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Application {
  id: number;
  job_id: number;
  company: string;
  position: string;
  status: string;
  progress: number;
  scheduled_event?: any;
  applied_at?: string;
}

export function ApplicationTracker() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await apiClient.getCandidateApplications();
        if (data && data.applications) {
          const apps = data.applications.map((app: any) => {
            let progress = 0;
            const normalizedStatus = app.status === "pending" ? "applied" : app.status;
            switch (normalizedStatus) {
              case "shortlisted": progress = 35; break;
              case "applied": progress = 10; break;
              case "interview": progress = 65; break;
              case "offer": progress = 100; break;
              case "rejected": progress = 100; break;
              default: progress = 0;
            }
            return {
              id: app.id,
              job_id: app.job_id,
              company: app.job?.company || "Unknown Company",
              position: app.job?.title || "Unknown Position",
              status: normalizedStatus,
              progress,
              scheduled_event: app.scheduled_event,
              applied_at: app.created_at || new Date().toISOString()
            };
          });
          setApplications(apps);
        } else {
          setApplications([]);
        }
      } catch (e) {
        console.error("Failed to fetch applications", e);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const handleViewMeeting = (event: any) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const getStepStatus = (currentStatus: string, stepName: string) => {
    const statusOrder = ["applied", "shortlisted", "interview", "offer"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepName);

    if (currentStatus === 'rejected') {
      if (stepName === 'offer') return 'inactive';
      return 'rejected';
    }

    if (currentIndex >= stepIndex) return "completed";
    if (currentIndex === stepIndex - 1) return "current";
    return "inactive";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 w-full bg-white dark:bg-card rounded-xl animate-pulse border border-border/40" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Application Tracker</h2>
          <p className="text-muted-foreground text-sm">Track your active job applications</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 border-blue-200 bg-blue-50 text-blue-700">
          {applications.length} Active
        </Badge>
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-card border border-dashed border-border/60 rounded-xl text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
            <Briefcase className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No applications yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">Start your job search today by exploring our latest opportunities matched to your profile.</p>
        </div>
      ) : (
        applications.map((app) => (
          <div key={app.id} className="bg-white dark:bg-card border border-border/40 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex md:items-center justify-between flex-col md:flex-row gap-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {app.company.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{app.position}</h3>
                  <p className="text-sm text-muted-foreground">{app.company} • Applied {new Date(app.applied_at || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>
              {app.scheduled_event && (
                <Button onClick={() => handleViewMeeting(app.scheduled_event)} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50">
                  <Video className="h-4 w-4 mr-2" /> Interview Details
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute top-3 left-0 w-full h-0.5 bg-muted"></div>
              <div className="grid grid-cols-4 relative z-10">
                {['applied', 'shortlisted', 'interview', 'offer'].map((step, idx) => {
                  const statusObj = getStepStatus(app.status, step);
                  const isActive = app.status === step;
                  const isComp = statusObj === 'completed';
                  const label = step.charAt(0).toUpperCase() + step.slice(1);
                  return (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center bg-white dark:bg-card transition-colors",
                        isActive ? "border-blue-600 text-blue-600" : (isComp ? "border-green-500 text-green-500 bg-green-50" : "border-muted text-muted-foreground"))}>
                        {isComp ? <CheckCircle2 className="h-3 w-3" /> : (isActive ? <div className="h-2 w-2 rounded-full bg-blue-600" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />)}
                      </div>
                      <span className={cn("text-xs font-semibold uppercase tracking-wider", isActive ? "text-blue-600" : (isComp ? "text-green-600" : "text-muted-foreground"))}>
                        {step === 'shortlisted' ? 'Screening' : label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))
      )}

      {selectedEvent && (
        <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
          <DialogContent className="border-none shadow-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                Interview Details
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedEvent.event_type ? selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1) : 'Event'} with {applications.find(a => a.scheduled_event?.id === selectedEvent.id)?.company || 'Company'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Date</p>
                  <p className="font-semibold text-lg">{new Date(selectedEvent.scheduled_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Time</p>
                  <p className="font-semibold text-lg">{new Date(selectedEvent.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                <p className="text-xs font-medium text-primary/80 uppercase tracking-widest mb-2">
                  {selectedEvent.mode === 'online' ? 'Meeting Link' : 'Location'}
                </p>
                <div className="break-all">
                  {selectedEvent.location_url ? (
                    selectedEvent.mode === 'online' ? (
                      <a href={selectedEvent.location_url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary transition-colors flex items-center gap-2 underline decoration-primary/50 underline-offset-4">
                        <Video className="h-4 w-4" />
                        Join Meeting Room
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 text-white">
                        <MapPin className="h-4 w-4" />
                        {selectedEvent.location_url}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-500 italic">No location provided</span>
                  )}
                </div>
              </div>

              {selectedEvent.notes && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-400">Notes from Recruiter</p>
                  <p className="text-sm bg-white/5 p-3 rounded-lg text-slate-300 border border-white/5">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
