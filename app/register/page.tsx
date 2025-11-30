import { RegisterForm } from "@/components/RegisterForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function Register() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <header className="p-6 flex items-center justify-between relative z-10">
        <Link href="/" className="group">
          <h1 className="text-2xl md:text-3xl font-bold text-primary group-hover:scale-105 transition-transform cursor-pointer">
            HireXAI
          </h1>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <RegisterForm />
      </div>
    </div>
  );
}
