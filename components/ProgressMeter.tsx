"use client";

import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ProgressMeterProps {
  value: number;
  label: string;
  showPercentage?: boolean;
}

export function ProgressMeter({ value, label, showPercentage = true }: ProgressMeterProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const getColorClass = () => {
    if (value >= 80) return "text-blue-600 dark:text-blue-400";
    if (value >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {showPercentage && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className={`text-sm font-bold ${getColorClass()}`}
          >
            {progress}%
          </motion.span>
        )}
      </div>
      <div className="relative">
        <Progress
          value={progress}
          className="h-3 bg-muted/50"
        />
        {/* Animated gradient overlay */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient"
          style={{ maxWidth: "100%" }}
        />
      </div>
    </motion.div>
  );
}
