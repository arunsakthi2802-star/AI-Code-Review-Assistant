"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Folder, History, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Redirect if not logged in
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  if (!mounted) return null;
  if (!token) return null; // Avoid flashing dashboard content while redirecting

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard"
    },
    {
      name: "Projects",
      href: "/dashboard/projects",
      icon: Folder,
      active: pathname.startsWith("/dashboard/projects")
    },
    {
      name: "History",
      href: "/dashboard/history",
      icon: History,
      active: pathname === "/dashboard/history"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-blue-500" />
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            AI Review
          </span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  item.active 
                    ? "bg-blue-600/10 text-blue-400 font-medium" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950/50">
          {children}
        </div>
      </main>
    </div>
  );
}
