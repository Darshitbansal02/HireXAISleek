import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
    return (
        <div className="flex h-screen bg-muted/10 overflow-hidden">
            {/* Sidebar Skeleton */}
            <aside className="hidden md:block w-64 h-full shrink-0 border-r border-border/50 bg-card/50 px-4 py-6 space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-11 w-full rounded-md" />
                    ))}
                </div>
            </aside>

            {/* Main Content Skeleton */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Skeleton */}
                <header className="h-16 shrink-0 border-b border-border/40 bg-background/80 px-6 flex items-center justify-between">
                    <Skeleton className="h-4 w-32 hidden md:block" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="h-8 w-[1px] bg-border/60 mx-1"></div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block text-right space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-2 w-32" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-6 md:p-8 space-y-6 overflow-hidden">
                    {/* Welcome Banner Skeleton */}
                    <Skeleton className="h-48 w-full rounded-3xl" />

                    {/* Stats Grid Skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-xl" />
                        ))}
                    </div>

                    {/* Main Grid Skeleton */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <Skeleton className="h-64 w-full rounded-xl" />
                                <Skeleton className="h-64 w-full rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-40 w-full rounded-xl" />
                            <Skeleton className="h-64 w-full rounded-xl" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
