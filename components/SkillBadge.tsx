"use client";

import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface SkillBadgeProps {
  skill: string;
  variant?: "default" | "secondary" | "outline";
}

const gradients = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-cyan-500 to-blue-600",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
];

export function SkillBadge({ skill, variant = "secondary" }: SkillBadgeProps) {
  // Generate consistent gradient based on skill name
  const gradientIndex = skill.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <Badge
        variant={variant}
        className={`relative overflow-hidden px-3 py-1.5 font-medium text-sm border-2 hover:border-primary/30 transition-all duration-300 group`}
        data-testid={`badge-skill-${skill.toLowerCase()}`}
      >
        {/* Gradient background on hover */}
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
        <span className="relative z-10">{skill}</span>
      </Badge>
    </motion.div>
  );
}
