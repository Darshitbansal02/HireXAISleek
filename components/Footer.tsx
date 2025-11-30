"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Mail, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold text-primary mb-4">
              HireXAI
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              AI-powered hiring platform transforming recruitment with intelligent matching and seamless workflows.
            </p>
            <div className="flex gap-3">
              <a href="#" className="h-10 w-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors group">
                <Twitter className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a href="#" className="h-10 w-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors group">
                <Linkedin className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a href="#" className="h-10 w-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors group">
                <Github className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a href="#" className="h-10 w-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors group">
                <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>
          </motion.div>

          {/* For Candidates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="font-bold text-foreground mb-4">For Candidates</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/candidate" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/candidate" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Resume Doctor
                </Link>
              </li>
              <li>
                <Link href="/candidate" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Resume Builder
                </Link>
              </li>
              <li>
                <Link href="/candidate" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Job Search
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* For Recruiters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="font-bold text-foreground mb-4">For Recruiters</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/recruiter" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/recruiter" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Candidate Search
                </Link>
              </li>
              <li>
                <Link href="/recruiter" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Post Jobs
                </Link>
              </li>
              <li>
                <Link href="/recruiter" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Analytics
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mr-2 group-hover:bg-primary transition-colors" />
                  Contact Us
                </a>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="pt-8 border-t border-border/50"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              © {currentYear} HireXAI. Made with <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" /> for better hiring.
            </p>
            <p>All rights reserved.</p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
