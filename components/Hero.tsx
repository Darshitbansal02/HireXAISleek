// Use the generated hero image placed in public/generated_images/

"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

// Use the generated hero image placed in public/generated_images/
const heroImage = "/generated_images/AI_recruitment_hero_illustration_b86ae2d4.png";


export function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container max-w-7xl mx-auto px-4 pt-3 pb-10 md:pt-16 md:pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 backdrop-blur-sm hover-lift"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">
                AI-Powered Hiring Platform
              </span>
            </motion.div>

            {/* Main Heading */}
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-foreground"
              >
                Hire Smarter,{" "}
                <span className="block mt-2">
                  Not Harder with{" "}
                  <span className="text-primary relative inline-block">
                    HireXAI
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                    </svg>
                  </span>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl"
              >
                Transform your hiring process with AI-driven resume analysis,
                intelligent candidate matching, and seamless workflows that save time and find the perfect fit.
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 text-base font-semibold px-8 py-6 rounded-xl shadow-lg hover:shadow-primary/25 transition-all hover:scale-105 bg-primary border-0 btn-glow"
                  data-testid="button-start-hiring"
                >
                  Start Hiring
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-base font-semibold px-8 py-6 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-all hover:scale-105 text-foreground/80"
                  data-testid="button-find-jobs"
                >
                  Find Jobs
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap gap-8 pt-4"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">10x</div>
                  <div className="text-sm text-muted-foreground">Faster Hiring</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">95%</div>
                  <div className="text-sm text-muted-foreground">Match Rate</div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 border border-border/50 hover:-translate-y-2">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20 z-10 pointer-events-none" />

              <motion.img
                src={heroImage}
                alt="AI-powered recruitment illustration"
                className="w-full h-auto"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Floating Badge */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 -right-8 glass-strong px-6 py-4 rounded-2xl shadow-xl border border-primary/20 z-20"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <img src="/hirexai_logo_premium.png" alt="Logo" className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">95% Match Rate</div>
                  <div className="text-xs text-muted-foreground">AI Accuracy</div>
                </div>
              </div>
            </motion.div>

            {/* Floating Badge 2 */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -left-8 glass-strong px-6 py-4 rounded-2xl shadow-xl border border-accent/20 z-20"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-sm font-semibold text-foreground">AI-Powered</div>
                  <div className="text-xs text-muted-foreground">Smart Matching</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
