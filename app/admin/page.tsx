"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatsCard } from "@/components/StatsCard";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { AIChatbox } from "@/components/AIChatbox";
import Link from "next/link";
import { Users, Briefcase, TrendingUp, Shield, Settings, LogOut, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const mockUsers = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "candidate", status: "active" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "recruiter", status: "active" },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", role: "candidate", status: "inactive" },
  { id: "4", name: "Alice Brown", email: "alice@example.com", role: "recruiter", status: "active" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit">("overview");

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-2xl font-bold text-primary cursor-pointer">
              HireXAI
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" data-testid="button-settings">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">Platform overview and management</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Users"
            value="2,450"
            icon={Users}
            trend={{ value: "12%", isPositive: true }}
          />
          <StatsCard
            title="Recruiters"
            value="342"
            icon={Briefcase}
            trend={{ value: "8%", isPositive: true }}
          />
          <StatsCard
            title="Candidates"
            value="2,108"
            icon={Users}
            trend={{ value: "15%", isPositive: true }}
          />
          <StatsCard
            title="Placements"
            value="892"
            icon={TrendingUp}
            trend={{ value: "3%", isPositive: false }}
          />
        </div>

        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            data-testid="tab-overview"
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            data-testid="tab-users"
          >
            Manage Users
          </Button>
          <Button
            variant={activeTab === "audit" ? "default" : "outline"}
            onClick={() => setActiveTab("audit")}
            data-testid="tab-audit"
          >
            <Shield className="h-4 w-4 mr-2" />
            Bias Audit
          </Button>
        </div>

        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="User Growth"
              data={[
                { name: "Jan", value: 1800 },
                { name: "Feb", value: 1950 },
                { name: "Mar", value: 2100 },
                { name: "Apr", value: 2200 },
                { name: "May", value: 2350 },
                { name: "Jun", value: 2450 },
              ]}
              type="line"
            />
            <AnalyticsChart
              title="Placements by Month"
              data={[
                { name: "Jan", value: 120 },
                { name: "Feb", value: 135 },
                { name: "Mar", value: 148 },
                { name: "Apr", value: 142 },
                { name: "May", value: 165 },
                { name: "Jun", value: 182 },
              ]}
              type="bar"
            />
          </div>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.status === "active"
                              ? "bg-green-500"
                              : "bg-gray-500"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-manage-${user.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === "audit" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Fairness & Bias Audit
                </CardTitle>
                <CardDescription>
                  Monitor hiring practices for bias and fairness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Gender Distribution</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Male</span>
                          <span>52%</span>
                        </div>
                        <div className="h-2 bg-blue-500 rounded" style={{ width: "52%" }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Female</span>
                          <span>48%</span>
                        </div>
                        <div className="h-2 bg-pink-500 rounded" style={{ width: "48%" }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Bias Score</h4>
                    <div className="text-3xl font-bold text-green-500">
                      92%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Fair hiring practices score
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Recent Alerts</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>✓ No bias detected in last 100 placements</p>
                    <p>✓ Gender parity maintained across all roles</p>
                    <p>✓ Equal opportunity scoring passed audit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AIChatbox />
    </div>
  );
}
