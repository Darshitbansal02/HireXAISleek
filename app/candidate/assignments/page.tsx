"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Loader2, Play, CheckCircle, Clock } from 'lucide-react';

export default function AssignmentsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<any[]>([]);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const data = await apiClient.listAssignments();
                setAssignments(data);
            } catch (error) {
                toast.error("Failed to load assignments");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, []);

    const handleStart = (id: string) => {
        router.push(`/candidate/test/${id}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8">
            <h1 className="text-3xl font-bold">My Assignments</h1>

            {assignments.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No active assignments found.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {assignments.map((assignment) => (
                        <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg">{assignment.test.title}</h3>
                                        <Badge variant={
                                            assignment.status === "completed" ? "secondary" :
                                                assignment.status === "started" ? "default" : "outline"
                                        }>
                                            {assignment.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{assignment.test.description}</p>
                                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {assignment.test.duration_minutes} mins</span>
                                        <span>Expires: {assignment.expires_at ? new Date(assignment.expires_at).toLocaleDateString() : "Never"}</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleStart(assignment.id)}
                                    disabled={assignment.status === "completed" || assignment.status === "expired"}
                                >
                                    {assignment.status === "started" ? "Resume Test" :
                                        assignment.status === "completed" ? "View Results" : "Start Test"}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
