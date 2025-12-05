"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Calendar, Video, MapPin } from "lucide-react";

interface ScheduleModalProps {
    candidateId: number | null;
    jobId?: number;
    isOpen: boolean;
    onClose: () => void;
    onScheduled?: () => void;
}

export function ScheduleModal({ candidateId, jobId, isOpen, onClose, onScheduled }: ScheduleModalProps) {
    const [loading, setLoading] = useState(false);
    const [eventType, setEventType] = useState("interview");
    const [mode, setMode] = useState("online");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [locationUrl, setLocationUrl] = useState("");
    const [notes, setNotes] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!candidateId || !date || !time) return;

        setLoading(true);
        try {
            const scheduledAt = new Date(`${date}T${time}`).toISOString();

            if (eventType === 'interview' && mode === 'online') {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/interview/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        candidate_id: candidateId,
                        job_id: jobId || null, // Send null if no job ID
                        scheduled_at: scheduledAt
                    })
                });
                if (!res.ok) throw new Error("Failed to schedule interview");
            } else {
                await apiClient.scheduleEvent({
                    candidate_id: candidateId,
                    job_id: jobId,
                    event_type: eventType,
                    scheduled_at: scheduledAt,
                    mode: mode,
                    location_url: locationUrl,
                    notes: notes
                });
            }

            toast({
                title: "Scheduled Successfully",
                description: `The ${eventType} has been scheduled.`,
            });

            if (onScheduled) onScheduled();
            onClose();
        } catch (error) {
            console.error("Scheduling error:", error);
            toast({
                title: "Error",
                description: "Failed to schedule event.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Schedule Event</DialogTitle>
                    <DialogDescription>
                        Set up an interview, test, or meeting with the candidate.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Event Type</Label>
                            <Select value={eventType} onValueChange={setEventType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="interview">Interview</SelectItem>
                                    <SelectItem value="test">Technical Test</SelectItem>
                                    <SelectItem value="meeting">General Meeting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Mode</Label>
                            <Select value={mode} onValueChange={setMode}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="online">Online (Video)</SelectItem>
                                    <SelectItem value="in_person">In Person</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Input
                                type="time"
                                required
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{mode === 'online' ? 'Meeting Link' : 'Location Address'}</Label>
                        {mode === 'online' ? (
                            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                A secure video interview link will be automatically generated.
                            </div>
                        ) : (
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="123 Office St, Room 4B"
                                    value={locationUrl}
                                    onChange={(e) => setLocationUrl(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            placeholder="Add any instructions or context for the candidate..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Scheduling...
                                </>
                            ) : (
                                <>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Schedule Event
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
