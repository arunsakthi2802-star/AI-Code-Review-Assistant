"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, Play, Trash2, Calendar, Code, AlertTriangle, CheckCircle, 
  Info, Shield, Sparkles, Clock, Copy, Check, ChevronDown, ChevronRight, FileText, Loader2, FolderPlus
} from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Issue {
  file_path: string;
  line_number?: number;
  severity: "critical" | "warning" | "info";
  category: "security" | "quality" | "performance" | "bug";
  description: string;
  code_snippet?: string;
  suggestion?: string;
}

interface Report {
  id: string;
  project_id: string;
  overall_score: number;
  summary: string;
  metrics: {
    security: number;
    quality: number;
    performance: number;
    maintainability: number;
  };
  issues: Issue[];
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  files_count: number;
  repository_url?: string;
  created_at: string;
}

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "files" | "history">("overview");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data);

      const repRes = await api.get(`/projects/${projectId}/reports`);
      setReports(repRes.data);
      if (repRes.data.length > 0) {
        setSelectedReport(repRes.data[0]); // default to latest report
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      toast.info("Triggering static code review engine...");
      
      const res = await api.post(`/projects/${projectId}/analyze`);
      toast.success("Analysis complete!");
      
      // Reload reports
      const repRes = await api.get(`/projects/${projectId}/reports`);
      setReports(repRes.data);
      setSelectedReport(res.data); // Switch to the new report
      
      // Update file count in project metadata
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Code analysis failed. Check backend console logs.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to permanently delete this project? This cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success("Project workspace deleted.");
      router.push("/dashboard/projects");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete project workspace.");
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Suggested fix copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-zinc-500">Loading audit workspace...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold">Workspace Not Found</h3>
        <p className="text-zinc-500 mt-2">The requested project audit space could not be located or accessed.</p>
        <Link href="/dashboard/projects" className="mt-6 inline-block">
          <Button>Back to projects</Button>
        </Link>
      </div>
    );
  }

  const criticalIssues = selectedReport?.issues.filter(i => i.severity === "critical") || [];
  const warningIssues = selectedReport?.issues.filter(i => i.severity === "warning") || [];
  const infoIssues = selectedReport?.issues.filter(i => i.severity === "info") || [];

  const filteredIssues = selectedReport?.issues.filter(i => {
    if (severityFilter === "all") return true;
    return i.severity === severityFilter;
  }) || [];

  // Group issues by file paths
  const filesList = Array.from(new Set(selectedReport?.issues.map(i => i.file_path) || []));

  // Determine Overall Score color class
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 stroke-emerald-500";
    if (score >= 50) return "text-amber-500 stroke-amber-500";
    return "text-rose-500 stroke-rose-500";
  };

  const getScoreBgCircle = (score: number) => {
    if (score >= 80) return "stroke-emerald-500/10";
    if (score >= 50) return "stroke-amber-500/10";
    return "stroke-rose-500/10";
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case "critical": return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "warning": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-zinc-900 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/projects" className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              {project.name}
            </h1>
            {project.language && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                {project.language}
              </span>
            )}
          </div>
          <p className="text-zinc-400 max-w-xl text-sm leading-relaxed">{project.description || "No description provided."}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" />
              {project.files_count} source files
            </span>
            {project.repository_url && (
              <span className="truncate max-w-[250px] text-zinc-400">
                URL: <a href={project.repository_url} target="_blank" rel="noreferrer" className="hover:text-blue-400 underline">{project.repository_url}</a>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={handleRunAnalysis} 
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Auditing Code...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" />
                Run Code Review
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDeleteProject}
            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 rounded-lg h-9 w-9"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-800 text-white py-16 text-center max-w-4xl mx-auto border-dashed">
          <FolderPlus className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-zinc-300">No Review Reports Yet</h3>
          <p className="text-zinc-500 mt-2 max-w-md mx-auto">
            This workspace hasn&apos;t been audited. Click the button below to parse code files and generate static scores.
          </p>
          <Button onClick={handleRunAnalysis} disabled={analyzing} className="mt-6 bg-blue-600 hover:bg-blue-700">
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Auditing...
              </>
            ) : (
              "Trigger First Code Review"
            )}
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-900 gap-6">
            {(["overview", "issues", "files", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3.5 text-sm font-semibold capitalize relative transition-colors ${
                  activeTab === tab ? "text-blue-500" : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabIndicator" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Score Section */}
                <Card className="bg-zinc-900/30 border-zinc-800/80 backdrop-blur-sm text-white col-span-1 lg:col-span-1 p-6 flex flex-col items-center justify-center space-y-6">
                  <h3 className="text-sm font-semibold text-zinc-400 tracking-wider uppercase self-start">Quality Score</h3>
                  
                  {/* Glowing Circular Gauge */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="transparent"
                        className="text-zinc-800"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={263.89}
                        initial={{ strokeDashoffset: 263.89 }}
                        animate={{ strokeDashoffset: 263.89 - (263.89 * (selectedReport?.overall_score || 0)) / 100 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className={getScoreColor(selectedReport?.overall_score || 0)}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-4xl font-extrabold">{selectedReport?.overall_score}</span>
                      <span className="text-xs text-zinc-500 block">/ 100</span>
                    </div>
                  </div>

                  {/* Summary issues count */}
                  <div className="w-full grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2">
                      <span className="text-lg font-bold text-rose-400">{criticalIssues.length}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-medium">Critical</span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
                      <span className="text-lg font-bold text-amber-400">{warningIssues.length}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-medium">Warning</span>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2">
                      <span className="text-lg font-bold text-blue-400">{infoIssues.length}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-medium">Info</span>
                    </div>
                  </div>
                </Card>

                {/* Sub-Metrics Details */}
                <Card className="bg-zinc-900/30 border-zinc-800/80 backdrop-blur-sm text-white col-span-1 lg:col-span-2 p-6 space-y-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 tracking-wider uppercase mb-5">Metrics Matrix</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Security metric */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-blue-500" /> Security
                          </span>
                          <span className="font-bold">{selectedReport?.metrics.security}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedReport?.metrics.security}%` }}
                            transition={{ duration: 1, delay: 0.1 }}
                            className="h-full bg-blue-500" 
                          />
                        </div>
                      </div>

                      {/* Code Quality metric */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-500" /> Code Quality
                          </span>
                          <span className="font-bold">{selectedReport?.metrics.quality}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedReport?.metrics.quality}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full bg-emerald-500" 
                          />
                        </div>
                      </div>

                      {/* Performance metric */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Play className="w-4 h-4 text-amber-500" /> Performance
                          </span>
                          <span className="font-bold">{selectedReport?.metrics.performance}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedReport?.metrics.performance}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="h-full bg-amber-500" 
                          />
                        </div>
                      </div>

                      {/* Maintainability metric */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-purple-500" /> Maintainability
                          </span>
                          <span className="font-bold">{selectedReport?.metrics.maintainability}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedReport?.metrics.maintainability}%` }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="h-full bg-purple-500" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4 mt-6">
                    <span className="text-xs text-zinc-500 block">LAST AUDIT REPORT GENERATED</span>
                    <span className="text-sm font-semibold text-zinc-300">
                      {selectedReport && new Date(selectedReport.created_at).toLocaleString()}
                    </span>
                  </div>
                </Card>

                {/* Audit summary */}
                <Card className="bg-zinc-900/20 border-zinc-800 text-white col-span-1 lg:col-span-3 p-6">
                  <h3 className="text-sm font-semibold text-zinc-400 tracking-wider uppercase mb-4">AI Audit Report Summary</h3>
                  <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                    {selectedReport?.summary}
                  </div>
                  
                  {selectedReport && selectedReport.issues.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                      <p className="text-xs text-zinc-500">We identified {selectedReport.issues.length} review points during static parsing.</p>
                      <Button variant="link" onClick={() => setActiveTab("issues")} className="text-blue-400 text-xs p-0 hover:text-blue-300 h-auto">
                        Inspect Issues List &rarr;
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {activeTab === "issues" && (
              <motion.div
                key="issues"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Severity filters */}
                <div className="flex gap-2">
                  {[
                    { label: "All Severity", value: "all" },
                    { label: `Critical (${criticalIssues.length})`, value: "critical" },
                    { label: `Warnings (${warningIssues.length})`, value: "warning" },
                    { label: `Info (${infoIssues.length})`, value: "info" }
                  ].map((btn) => (
                    <Button
                      key={btn.value}
                      variant="outline"
                      size="sm"
                      onClick={() => setSeverityFilter(btn.value)}
                      className={`text-xs px-3 py-1.5 h-8 rounded-lg transition-colors border-zinc-800 ${
                        severityFilter === btn.value
                          ? "bg-blue-600 border-blue-600 text-white font-medium"
                          : "bg-zinc-900/40 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>

                {filteredIssues.length === 0 ? (
                  <Card className="bg-zinc-900/20 border-zinc-800 py-12 text-center max-w-4xl mx-auto">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h4 className="text-lg font-bold">No Issues Found</h4>
                    <p className="text-zinc-500 text-sm mt-1">Excellent! No audit concerns were flagged matching this severity index.</p>
                  </Card>
                ) : (
                  <div className="space-y-4 max-w-5xl">
                    {filteredIssues.map((issue, idx) => {
                      const isExpanded = expandedIssue === idx;
                      return (
                        <div 
                          key={idx}
                          className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300"
                        >
                          {/* Issue header card clickable */}
                          <div 
                            onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/70 transition-colors select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {getSeverityIcon(issue.severity)}
                              <div className="truncate">
                                <p className="font-semibold text-sm text-zinc-100 flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-extrabold ${getSeverityBadge(issue.severity)}`}>
                                    {issue.severity}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                                    {issue.category}
                                  </span>
                                  <span className="text-zinc-300 font-mono text-xs max-w-xs md:max-w-md truncate">
                                    {issue.file_path}{issue.line_number ? ` : L${issue.line_number}` : ""}
                                  </span>
                                </p>
                                <p className="text-xs text-zinc-400 truncate mt-1 max-w-xl">{issue.description}</p>
                              </div>
                            </div>
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-500 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />}
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="px-4 pb-5 border-t border-zinc-800/80 bg-zinc-950/40 space-y-4 pt-4">
                              <div className="space-y-1.5">
                                <span className="text-xs text-zinc-500 font-semibold uppercase">Description</span>
                                <p className="text-sm text-zinc-300 leading-relaxed">{issue.description}</p>
                              </div>

                              {issue.code_snippet && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                                  <div className="space-y-1.5">
                                    <span className="text-xs text-rose-400 font-semibold uppercase">Problem Code</span>
                                    <div className="bg-rose-950/10 border border-rose-500/20 rounded-lg p-3 overflow-x-auto font-mono text-xs text-rose-300">
                                      <pre>{issue.code_snippet}</pre>
                                    </div>
                                  </div>

                                  {issue.suggestion && (
                                    <div className="space-y-1.5 relative group/fix">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-emerald-400 font-semibold uppercase">AI Recommended Refactoring</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => copyToClipboard(issue.suggestion || "", idx)}
                                          className="h-6 w-6 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded"
                                        >
                                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </Button>
                                      </div>
                                      <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-lg p-3 overflow-x-auto font-mono text-xs text-emerald-300">
                                        <pre>{issue.suggestion}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "files" && (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 max-w-4xl"
              >
                <div className="flex items-center gap-2 mb-2 text-sm text-zinc-400">
                  <FileText className="w-4 h-4" />
                  <span>Showing {filesList.length} files flagged with recommendations.</span>
                </div>
                
                {filesList.length === 0 ? (
                  <Card className="bg-zinc-900/20 border-zinc-800 p-8 text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-zinc-400 text-sm">All files are in perfect condition according to index scanning!</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filesList.map((file, idx) => {
                      const fileIssues = selectedReport?.issues.filter(i => i.file_path === file) || [];
                      const criticalCount = fileIssues.filter(i => i.severity === "critical").length;
                      const warningCount = fileIssues.filter(i => i.severity === "warning").length;
                      const infoCount = fileIssues.filter(i => i.severity === "info").length;

                      return (
                        <div 
                          key={idx}
                          className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Code className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="font-mono text-sm font-semibold text-zinc-200">{file}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">Total review points: {fileIssues.length}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {criticalCount > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                                {criticalCount} Critical
                              </span>
                            )}
                            {warningCount > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                                {warningCount} Warning
                              </span>
                            )}
                            {infoCount > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                                {infoCount} Info
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 max-w-4xl"
              >
                <div className="flex items-center gap-2 mb-2 text-sm text-zinc-400">
                  <Clock className="w-4 h-4" />
                  <span>Audit report archive logs. Click a log to browse past results.</span>
                </div>

                <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40">
                  {reports.map((report) => (
                    <div 
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report);
                        setActiveTab("overview");
                        toast.success(`Switched report context to ${new Date(report.created_at).toLocaleDateString()}`);
                      }}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedReport?.id === report.id 
                          ? "bg-blue-600/10 hover:bg-blue-600/15" 
                          : "hover:bg-zinc-900/40"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-200">
                          Review generated {new Date(report.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Time: {new Date(report.created_at).toLocaleTimeString()} | Flagged Issues: {report.issues.length}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-xl font-bold font-mono px-3 py-1 rounded-lg ${
                          report.overall_score >= 80 ? "text-emerald-500 bg-emerald-500/5" :
                          report.overall_score >= 50 ? "text-amber-500 bg-amber-500/5" :
                          "text-rose-500 bg-rose-500/5"
                        }`}>
                          {report.overall_score}/100
                        </span>
                        {selectedReport?.id === report.id && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded">
                            active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
