"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, ArrowRight, Folder, AlertTriangle, Play } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

interface HistoryLog {
  id: string;
  project_id: string;
  project_name: string;
  overall_score: number;
  created_at: string;
  issues_count: number;
  critical_count: number;
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // Fetch projects first
      const projectsRes = await api.get("/projects/");
      const projectsList = projectsRes.data;

      const allLogs: HistoryLog[] = [];
      
      // Fetch reports for each project
      for (const proj of projectsList) {
        try {
          const reportsRes = await api.get(`/projects/${proj.id}/reports`);
          reportsRes.data.forEach((r: any) => {
            const critical_count = r.issues.filter((i: any) => i.severity === "critical").length;
            allLogs.push({
              id: r.id,
              project_id: proj.id,
              project_name: proj.name,
              overall_score: r.overall_score,
              created_at: r.created_at,
              issues_count: r.issues.length,
              critical_count: critical_count
            });
          });
        } catch (err) {
          console.error(`Failed to fetch reports for project ${proj.id}`, err);
        }
      }

      // Sort logs by date descending
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(allLogs);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load audit history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          Audit Logs History
        </h1>
        <p className="text-zinc-400 mt-1">Timeline of code audits and review results across your workspaces.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-zinc-500 text-sm">Compiling historical timelines...</p>
        </div>
      ) : logs.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-800 text-white text-center py-16 border-dashed">
          <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No Review Logs Recorded</h3>
          <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
            You haven&apos;t run any static code reviews yet. Create or open a project workspace to begin auditing.
          </p>
          <Link href="/dashboard/projects/new" className="mt-6 inline-block">
            <Button className="bg-blue-600 hover:bg-blue-700">Start First Audit</Button>
          </Link>
        </Card>
      ) : (
        <div className="relative border-l border-zinc-850 pl-6 ml-3 space-y-6">
          {logs.map((log) => {
            const date = new Date(log.created_at);
            return (
              <div key={log.id} className="relative">
                {/* Timeline node */}
                <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-blue-500 bg-black">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                </span>

                <Card className="bg-zinc-900/40 border-zinc-850 hover:border-zinc-700 transition-colors text-white shadow-sm overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center p-5 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-zinc-300 hover:underline">
                        <Link href={`/dashboard/projects/${log.project_id}`}>{log.project_name}</Link>
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({date.toLocaleDateString()} {date.toLocaleTimeString()})
                      </span>
                    </div>

                    <div className="flex gap-4 text-xs text-zinc-400">
                      <span>Total issues: {log.issues_count}</span>
                      {log.critical_count > 0 && (
                        <span className="text-rose-400 flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {log.critical_count} critical
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-stretch justify-between md:self-auto border-t md:border-t-0 border-zinc-800/80 pt-3 md:pt-0">
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Audit Score</span>
                      <span className={`text-2xl font-black font-mono leading-none mt-1 ${
                        log.overall_score >= 80 ? "text-emerald-500" :
                        log.overall_score >= 50 ? "text-amber-500" :
                        "text-rose-500"
                      }`}>
                        {log.overall_score}/100
                      </span>
                    </div>
                    
                    <Link href={`/dashboard/projects/${log.project_id}`}>
                      <Button variant="outline" size="sm" className="bg-zinc-950 border-zinc-850 text-zinc-300 hover:text-white hover:bg-zinc-900 gap-1.5 text-xs">
                        Workspace
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
