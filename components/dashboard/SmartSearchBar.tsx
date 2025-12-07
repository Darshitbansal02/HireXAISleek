"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SmartSearchBar() {
    return (
        <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder="Search candidates..." />
            <Button type="submit" size="icon">
                <Search className="h-4 w-4" />
            </Button>
        </div>
    );
}
