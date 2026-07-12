"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Folder, Search, Loader2, Code, Trash2 } from "lucide-react";
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects/");
      setProjects(res.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      toast.error("Could not load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this project and all its reviews?")) {
      return;
    }

    try {
      setDeletingId(projectId);
      await api.delete(`/projects/${projectId}`);
      toast.success("Project deleted successfully");
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error("Failed to delete project", error);
      toast.error("Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Projects
          </h1>
          <p className="text-zinc-400 mt-1">Manage and audit your code repositories.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02]">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-1.5 max-w-md focus-within:border-blue-500/50 transition-colors">
        <Search className="w-4 h-4 text-zinc-500" />
        <Input 
          type="text" 
          placeholder="Search projects..." 
          className="border-0 bg-transparent text-white p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-zinc-900/40 rounded-xl animate-pulse border border-zinc-800/60"></div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl border-dashed max-w-4xl mx-auto backdrop-blur-sm">
          <Folder className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-zinc-300 mb-2">
            {search ? "No projects found matching search" : "Create your first project"}
          </h3>
          <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
            {search ? "Try refining your query terms." : "Get started by importing your repository or uploading files to perform code review."}
          </p>
          {!search && (
            <Link href="/dashboard/projects/new">
              <Button className="bg-blue-600 hover:bg-blue-700">Create Project</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="group">
              <Card className="bg-zinc-900/40 border-zinc-800/80 text-white hover:border-blue-500/50 hover:bg-zinc-900/60 transition-all cursor-pointer h-full relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    onClick={(e) => handleDelete(e, project.id)}
                    disabled={deletingId === project.id}
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Folder className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-zinc-500">
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="text-zinc-400 line-clamp-2 mt-1">
                    {project.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 flex items-center justify-between mt-auto">
                  <div className="flex gap-2">
                    {project.language && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        {project.language}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Code className="w-3.5 h-3.5" />
                    {project.files_count} files
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
