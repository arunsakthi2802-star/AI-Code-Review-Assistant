"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Folder, Clock, Activity } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  files_count: number;
  created_at: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const res = await api.get("/projects/");
        const projectsList = res.data;
        setProjects(projectsList);

        let reviewsCount = 0;
        let totalScoreSum = 0;
        let scoredProjectsCount = 0;

        // Fetch reports for each project to calculate dashboard totals
        for (const proj of projectsList) {
          try {
            const reportsRes = await api.get(`/projects/${proj.id}/reports`);
            const reports = reportsRes.data;
            reviewsCount += reports.length;
            
            if (reports.length > 0) {
              // Add the score of the latest report for this project
              totalScoreSum += reports[0].overall_score;
              scoredProjectsCount++;
            }
          } catch (err) {
            console.error(`Failed to get reports for project ${proj.id}`, err);
          }
        }

        setTotalReviews(reviewsCount);
        if (scoredProjectsCount > 0) {
          setAvgScore(Math.round(totalScoreSum / scoredProjectsCount));
        } else {
          setAvgScore(null);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Welcome back! Here&apos;s an overview of your code reviews.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Projects</CardTitle>
            <Folder className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Audits</CardTitle>
            <Clock className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Average Score</CardTitle>
            <Activity className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgScore !== null ? `${avgScore}/100` : "--/100"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Your Projects</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-zinc-900 rounded-xl animate-pulse border border-zinc-800"></div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-xl border-dashed">
            <Folder className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-zinc-400 mb-6 max-w-sm mx-auto">Get started by creating your first project and analyzing some code.</p>
            <Link href="/dashboard/projects/new">
              <Button className="bg-blue-600 hover:bg-blue-700">Create Project</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link href={`/dashboard/projects/${project.id}`} key={project.id}>
                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-blue-500/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="text-zinc-400 line-clamp-2">
                      {project.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {project.language && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                          {project.language}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
