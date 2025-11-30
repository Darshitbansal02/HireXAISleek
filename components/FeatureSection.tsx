"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, FileText, BarChart3, Users, Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Brain,
    title: "AI Resume Doctor",
    description: "Get instant ATS scores and actionable feedback to optimize your resume for better visibility.",
    category: "candidates",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: FileText,
    title: "Smart Resume Builder",
    description: "Create professional resumes with AI assistance and download as PDF instantly.",
    category: "candidates",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Users,
    title: "Semantic Candidate Search",
    description: "Find the perfect candidates using natural language queries powered by AI.",
    category: "recruiters",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Zap,
    title: "AI Job Description Writer",
    description: "Generate compelling job descriptions in seconds with AI-powered suggestions.",
    category: "recruiters",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: BarChart3,
    title: "Placement Analytics",
    description: "Track hiring trends, diversity metrics, and placement success rates in real-time.",
    category: "institutions",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: Shield,
    title: "Bias-Free Hiring",
    description: "Ensure fair hiring practices with AI-powered bias detection and audit trails.",
    category: "institutions",
    gradient: "from-red-500 to-rose-500",
  },
];

interface FeatureSectionProps {
  category?: "all" | "candidates" | "recruiters" | "institutions";
}

export function FeatureSection({ category = "all" }: FeatureSectionProps) {
  const filteredFeatures = category === "all"
    ? features
    : features.filter((f) => f.category === category);

  return (
    <div className="py-12 md:py-20 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 mb-6"
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Powerful Features</span>
          </motion.div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Succeed
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Whether you're a candidate, recruiter, or institution, HireXAI has the AI-powered tools you need to transform your hiring process.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full group hover-lift border-premium hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur-sm">
                <CardHeader className="space-y-4">
                  {/* Icon with Gradient Background */}
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="h-full w-full rounded-2xl bg-card flex items-center justify-center">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>

                  <div>
                    <CardTitle className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-4">
            Ready to experience the future of hiring?
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Get Started Free
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
