"use client";

import { Button } from "@/components/ui/button";
import { Plus, Upload, Users } from "lucide-react";

export function QuickActionsBar() {
    return (
        <div className="flex gap-2">
            <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Post Job
            </Button>
            <Button size="sm" variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button size="sm" variant="ghost">
                <Users className="mr-2 h-4 w-4" /> Team
            </Button>
        </div>
    );
}
