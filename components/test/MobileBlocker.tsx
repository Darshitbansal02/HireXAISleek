import React, { useEffect, useState } from 'react';
import { Smartphone, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MobileBlocker({ children }: { children: React.ReactNode }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreen = () => {
            if (window.innerWidth < 850) {
                setIsMobile(true);
            } else {
                setIsMobile(false);
            }
        };

        checkScreen();
        window.addEventListener('resize', checkScreen);
        return () => window.removeEventListener('resize', checkScreen);
    }, []);

    if (isMobile) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-destructive/50 shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-destructive/10 p-4 rounded-full mb-4 w-fit">
                            <Smartphone className="w-8 h-8 text-destructive" />
                        </div>
                        <CardTitle className="text-xl font-bold text-destructive">Desktop Required</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            This assessment requires a desktop or laptop computer to ensure a fair and secure testing environment.
                        </p>
                        <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-lg text-sm flex items-start gap-2 text-left">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Mobile devices and tablets are not supported due to proctoring requirements.</span>
                        </div>
                        <p className="text-sm font-medium">Please switch to a larger screen to continue.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
