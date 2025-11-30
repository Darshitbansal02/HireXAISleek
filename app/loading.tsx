"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-6"
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                >
                    <Loader2 className="h-16 w-16 text-primary" />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-primary">
                        Loading...
                    </h2>
                    <p className="text-muted-foreground">Please wait while we prepare your content</p>
                </div>
            </motion.div>
        </div>
    );
}
