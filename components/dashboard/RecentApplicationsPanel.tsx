import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentApplicationsPanel() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">No recent applications.</p>
            </CardContent>
        </Card>
    );
}
