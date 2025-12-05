"use client";
// Force rebuild

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { Loader2, AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';

export default function TestResultsPage() {
    const params = useParams();
    const testId = params.testId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [test, setTest] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [testData, assignmentsData] = await Promise.all([
                    apiClient.getTest(testId),
                    apiClient.getTestAssignments(testId)
                ]);
                setTest(testData);
                setAssignments(assignmentsData);
            } catch (error) {
                toast.error("Failed to load results");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (testId) {
            fetchData();
        }
    }, [testId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!test) {
        return <div className="p-8 text-center">Test not found.</div>;
    }

    return (
        <div className="container mx-auto py-8 max-w-6xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{test.title} - Results</h1>
                    <p className="text-muted-foreground mt-1">{test.description}</p>
                </div>
                <Button variant="outline" onClick={() => router.push("/recruiter")}>
                    Back to Dashboard
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Assigned</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{assignments.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{assignments.filter(a => a.status === 'completed').length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Score</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {assignments.filter(a => a.score !== null).length > 0
                                ? (assignments.reduce((acc, a) => acc + (a.score || 0), 0) / assignments.filter(a => a.score !== null).length).toFixed(1) + "%"
                                : "N/A"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Candidates</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Candidate ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Warnings</TableHead>
                                <TableHead>Submitted At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.map((assignment) => (
                                <TableRow key={assignment.id}>
                                    <TableCell className="font-mono">{assignment.candidate_id}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            assignment.status === "completed" ? "secondary" :
                                                assignment.status === "started" ? "default" : "outline"
                                        }>
                                            {assignment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold">
                                        {assignment.score !== null ? `${assignment.score}%` : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {assignment.warning_count > 0 ? (
                                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> {assignment.warning_count}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">0</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {assignment.completed_at ? new Date(assignment.completed_at).toLocaleString() : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => router.push(`/recruiter/tests/${testId}/results/${assignment.id}`)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {assignments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No candidates assigned yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
