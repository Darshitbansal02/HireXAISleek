"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AssignTestModalProps {
    candidateId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export function AssignTestModal({ candidateId, isOpen, onClose }: AssignTestModalProps) {
    const [tests, setTests] = useState<any[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string>("");
    const [scheduledAt, setScheduledAt] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTests();
        }
    }, [isOpen]);

    const fetchTests = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getTests();
            setTests(data || []);
        } catch (err) {
            console.error("Failed to fetch tests", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!candidateId || !selectedTestId) return;
        setAssigning(true);
        try {
            // Convert local datetime string to ISO string if present
            const isoScheduledAt = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;

            await apiClient.assignTest(selectedTestId, [candidateId], undefined, isoScheduledAt);
            toast.success("Test assigned successfully!");
            onClose();
        } catch (err) {
            toast.error("Failed to assign test");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Assessment</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Assessment</Label>
                        <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a test..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tests.map((test) => (
                                    <SelectItem key={test.id} value={test.id.toString()}>
                                        {test.title} ({test.duration_minutes} mins)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Scheduled Start Time (Optional)</Label>
                        <Input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            If set, the candidate cannot start the test before this time.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={!selectedTestId || assigning}>
                        {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Assign Test
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
