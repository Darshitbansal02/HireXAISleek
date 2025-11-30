import { pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // "candidate", "recruiter", "admin"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["candidate", "recruiter", "admin"]),
}).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Candidate profiles
export const candidateProfiles = pgTable("candidate_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title"),
  location: text("location"),
  experience: text("experience"),
  skills: text("skills").array(),
  resumeUrl: text("resume_url"),
  resumeText: text("resume_text"),
  atsScore: integer("ats_score"),
  profileCompletion: integer("profile_completion").default(0),
});

export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles, {
  userId: z.number(),
  skills: z.array(z.string()).optional(),
}).omit({
  id: true,
});
export type InsertCandidateProfile = z.infer<typeof insertCandidateProfileSchema>;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;

// Jobs table
export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  recruiterId: integer("recruiter_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(), // "full-time", "part-time", "contract", "remote"
  description: text("description").notNull(),
  requirements: text("requirements").array(),
  skills: text("skills").array(),
  salary: text("salary"),
  status: text("status").notNull().default("active"), // "active", "closed", "draft"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobs, {
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// Applications table
export const applications = pgTable("applications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  candidateId: integer("candidate_id").notNull().references(() => users.id),
  status: text("status").notNull().default("applied"), // "applied", "interview", "offer", "rejected"
  matchScore: integer("match_score"),
  coverLetter: text("cover_letter"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

export const insertApplicationSchema = createInsertSchema(applications, {
  jobId: z.number(),
  candidateId: z.number(),
}).omit({
  id: true,
  appliedAt: true,
});
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

// Resume analysis results
export const resumeAnalyses = pgTable("resume_analyses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  atsScore: integer("ats_score").notNull(),
  missingKeywords: text("missing_keywords").array(),
  suggestions: text("suggestions").array(),
  strengths: text("strengths").array(),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const insertResumeAnalysisSchema = createInsertSchema(resumeAnalyses, {
  userId: z.number(),
  atsScore: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
}).omit({
  id: true,
  analyzedAt: true,
});
export type InsertResumeAnalysis = z.infer<typeof insertResumeAnalysisSchema>;
export type ResumeAnalysis = typeof resumeAnalyses.$inferSelect;
