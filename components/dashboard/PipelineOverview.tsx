import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PipelineOverview() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Pipeline Chart Placeholder
                </div>
            </CardContent>
        </Card>
    );
}
