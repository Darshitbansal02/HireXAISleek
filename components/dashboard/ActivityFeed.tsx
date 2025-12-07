import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityFeed() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">No recent activity.</p>
            </CardContent>
        </Card>
    );
}
