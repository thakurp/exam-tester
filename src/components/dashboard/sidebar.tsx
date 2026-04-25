"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BookOpen,
  LayoutDashboard,
  History,
  Trophy,
  Settings,
  ChevronRight,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@prisma/client";

interface SidebarProps {
  user: User;
}

const studentNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Practice Tests", href: "/practice", icon: FileText },
  { label: "Test History", href: "/test/history", icon: History },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Questions", href: "/admin/questions", icon: BookOpen },
  { label: "Subjects", href: "/admin/subjects", icon: BookOpen },
  { label: "Source Documents", href: "/admin/source-documents", icon: BookOpen },
  { label: "Upload CSV", href: "/admin/upload", icon: BookOpen },
  { label: "Generate AI", href: "/admin/generate", icon: BookOpen },
  { label: "Papers", href: "/admin/papers", icon: FileText },
];

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const nav = user.role === "ADMIN" ? adminNav : studentNav;

  return (
    <div className="hidden md:flex w-64 flex-shrink-0 bg-white border-r flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b">
        <BookOpen className="h-6 w-6 text-indigo-600" />
        <span className="font-bold">ExamTester</span>
        {user.role === "ADMIN" && (
          <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium ml-auto">
            Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t">
        <div className="flex items-center gap-3 px-2">
          <UserButton />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name ?? "Student"}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
