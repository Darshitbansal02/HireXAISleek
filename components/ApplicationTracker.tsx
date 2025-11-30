import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Video, MapPin, Loader2 } from "lucide-react";

interface Application {
  id: number;
  job_id: number;
  company: string;
  position: string;
  status: string;
  progress: number;
  scheduled_event?: any;
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
            switch (app.status) {
              case "shortlisted":
                progress = 15;
                break;
              case "applied":
                progress = 25;
                break;
              case "interview":
                progress = 75;
                break;
              case "offer":
                progress = 100;
                break;
              case "rejected":
                progress = 50;
                break;
              default:
                progress = 0;
            }
            return {
              id: app.id,
              job_id: app.job_id,
              company: app.job?.company || "Unknown Company",
              position: app.job?.title || "Unknown Position",
              status: app.status,
              progress,
              scheduled_event: app.scheduled_event
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

  if (loading) {
    return (
      <Card className="border-premium">
        <CardHeader>
          <CardTitle>Application Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    shortlisted: "bg-indigo-500",
    applied: "bg-slate-500",
    interview: "bg-orange-500",
    offer: "bg-primary",
    rejected: "bg-red-500",
  };

  const handleViewMeeting = (event: any) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  return (
    <>
      <Card className="border-premium">
        <CardHeader>
          <CardTitle>Application Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No applications yet.</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4 space-y-3" data-testid={`application-${app.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold">{app.position}</h4>
                      <p className="text-sm text-muted-foreground">{app.company}</p>
                    </div>
                    <Badge className={statusColors[app.status] || "bg-gray-500"}>{app.status}</Badge>
                  </div>
                  <Progress value={app.progress} />

                  {app.scheduled_event && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-primary/50 text-primary hover:bg-primary/10"
                        onClick={() => handleViewMeeting(app.scheduled_event)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        View Meeting Details
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEvent && (
        <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scheduled {selectedEvent.event_type ? selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1) : 'Event'}</DialogTitle>
              <DialogDescription>
                Details for your scheduled {selectedEvent.event_type || 'event'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p>{new Date(selectedEvent.scheduled_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time</p>
                  <p>{new Date(selectedEvent.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mode</p>
                  <p className="capitalize">{selectedEvent.mode?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="outline">{selectedEvent.status}</Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedEvent.mode === 'online' ? 'Meeting Link' : 'Location'}
                </p>
                <div className="p-2 bg-muted rounded-md text-sm break-all">
                  {selectedEvent.location_url ? (
                    selectedEvent.mode === 'online' ? (
                      <a href={selectedEvent.location_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        {selectedEvent.location_url}
                      </a>
                    ) : (
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {selectedEvent.location_url}
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground italic">No location provided</span>
                  )}
                </div>
              </div>

              {selectedEvent.notes && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm bg-muted/50 p-2 rounded-md">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
