import { Hero } from "@/components/Hero";
import { FeatureSection } from "@/components/FeatureSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Premium Header with Glassmorphism */}
      <header className="fixed top-0 w-full z-50 border-b border-border/40 glass-strong backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <img src="/hirexai_logo_premium.png" alt="Logo" className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                HireXAI
              </h1>
            </Link>
            <div className="flex items-center gap-3 md:gap-4">
              <Link href="/login">
                <Button
                  variant="ghost"
                  data-testid="button-signin"
                  className="hover:bg-primary/10 transition-colors"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  data-testid="button-getstarted"
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-md hover:shadow-lg"
                >
                  Get Started
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16">
        <Hero />
        <FeatureSection />
        <Footer />
      </div>
    </div>
  );
}
