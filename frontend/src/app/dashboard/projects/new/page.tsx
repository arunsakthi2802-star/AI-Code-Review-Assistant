"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, Upload, Globe, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [importType, setImportType] = useState<"upload" | "github">("upload");
  const [zipFile, setZipFile] = useState<File | null>(null);
  
  // Loading state states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith(".zip")) {
        setZipFile(file);
      } else {
        toast.error("Please upload a valid .zip archive");
      }
    }
  };

  const steps = [
    "Registering project workspace...",
    "Extracting file tree...",
    "Scanning code syntax & dependencies...",
    "Auditing security vulnerabilities...",
    "Generating refactoring recommendations...",
    "Compiling quality report..."
  ];

  const triggerStepProgress = () => {
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (importType === "upload" && !zipFile) {
      // Allow analyzing empty or write_mock fallback automatically, but warn
      toast.info("No file uploaded. We will generate a sample template workspace to demonstrate the code audit.");
    }

    let intervalId: any;
    try {
      setIsSubmitting(true);
      intervalId = triggerStepProgress();

      // 1. Create project metadata
      const projectRes = await api.post("/projects/", {
        name,
        description,
        language: language || undefined,
        repository_url: importType === "github" ? repoUrl : undefined
      });
      
      const projectId = projectRes.data.id;

      // 2. Trigger analysis
      const formData = new FormData();
      if (importType === "upload" && zipFile) {
        formData.append("file", zipFile);
      }

      await api.post(`/projects/${projectId}/analyze`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Analysis complete!");
      router.push(`/dashboard/projects/${projectId}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete project analysis. Make sure python requirements are installed.");
    } finally {
      if (intervalId) clearInterval(intervalId);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Loading Screen Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-6 transition-all duration-300">
          <div className="relative flex flex-col items-center max-w-md w-full text-center space-y-8 bg-zinc-950 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-blue-500 border-b border-l animate-spin"></div>
              <FolderPlus className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Auditing Workspace</h3>
              <p className="text-zinc-400 text-sm">Please hold on. This takes about a minute depending on repository size.</p>
            </div>

            <div className="w-full space-y-4 text-left">
              {steps.map((step, idx) => {
                const isCurrent = idx === loadingStep;
                const isPast = idx < loadingStep;
                return (
                  <div key={idx} className="flex items-center gap-3 transition-all duration-300">
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-zinc-800 flex-shrink-0"></div>
                    )}
                    <span className={`text-sm ${
                      isPast ? "text-zinc-500 line-through" : isCurrent ? "text-blue-400 font-medium" : "text-zinc-600"
                    }`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link href="/dashboard/projects" className="text-zinc-500 hover:text-white transition-colors">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <span className="text-sm text-zinc-500">Back to projects</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold">New Audit Workspace</h1>
        <p className="text-zinc-400 mt-1">Configure your repository to initialize static analysis scoring.</p>
      </div>

      <Card className="bg-zinc-950 border-zinc-800 text-white shadow-xl">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription className="text-zinc-500">Provide basic information about your codebase.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="proj_name">Project Name <span className="text-red-500">*</span></Label>
                <Input
                  id="proj_name"
                  type="text"
                  placeholder="e.g. My Express API"
                  className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proj_lang">Primary Language</Label>
                <Input
                  id="proj_lang"
                  type="text"
                  placeholder="e.g. Python, TypeScript"
                  className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj_desc">Description</Label>
              <Input
                id="proj_desc"
                type="text"
                placeholder="Optional brief description"
                className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Label>Source Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border font-medium transition-all ${
                    importType === "upload"
                      ? "border-blue-600 bg-blue-600/5 text-blue-400"
                      : "border-zinc-800 hover:border-zinc-700 bg-transparent text-zinc-400"
                  }`}
                  onClick={() => setImportType("upload")}
                >
                  <Upload className="w-5 h-5" />
                  ZIP File Upload
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border font-medium transition-all ${
                    importType === "github"
                      ? "border-blue-600 bg-blue-600/5 text-blue-400"
                      : "border-zinc-800 hover:border-zinc-700 bg-transparent text-zinc-400"
                  }`}
                  onClick={() => setImportType("github")}
                >
                  <Globe className="w-5 h-5" />
                  GitHub Repository
                </button>
              </div>
            </div>

            {importType === "upload" ? (
              <div className="border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-8 text-center transition-colors relative cursor-pointer group bg-zinc-900/10">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                <p className="text-sm font-medium mb-1">
                  {zipFile ? zipFile.name : "Select or drag your project ZIP archive"}
                </p>
                <p className="text-xs text-zinc-500">
                  {zipFile 
                    ? `Size: ${(zipFile.size / 1024 / 1024).toFixed(2)} MB` 
                    : "Supports standard ZIP folder format. Max file size: 20MB."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="git_url">GitHub Repository HTTPS URL</Label>
                <Input
                  id="git_url"
                  type="url"
                  placeholder="https://github.com/username/repository"
                  className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
                <p className="text-xs text-zinc-500">Clones public git repositories via HTTP protocol.</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-md font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              Initialize & Analyze Code
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
