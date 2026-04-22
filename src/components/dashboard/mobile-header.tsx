"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  LayoutDashboard,
  History,
  Trophy,
  Menu,
} from "lucide-react";
import type { User } from "@prisma/client";

const studentNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Test History", href: "/test/history", icon: History },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Questions", href: "/admin/questions", icon: BookOpen },
  { label: "Subjects", href: "/admin/subjects", icon: BookOpen },
  { label: "Upload CSV", href: "/admin/upload", icon: BookOpen },
  { label: "Generate AI", href: "/admin/generate", icon: BookOpen },
];

export function MobileHeader({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = user.role === "ADMIN" ? adminNav : studentNav;

  return (
    <header className="md:hidden sticky top-0 z-20 bg-white border-b h-14 flex items-center px-4 gap-3">
      <button
        onClick={() => setOpen(true)}
        className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 flex-1">
        <BookOpen className="h-5 w-5 text-indigo-600" />
        <span className="font-bold text-sm">ExamTester</span>
        {user.role === "ADMIN" && (
          <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
            Admin
          </span>
        )}
      </div>

      <UserButton />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          {/* Sheet header */}
          <div className="h-14 flex items-center gap-2 px-4 border-b">
            <BookOpen className="h-5 w-5 text-indigo-600" />
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
                (item.href !== "/dashboard" &&
                  item.href !== "/admin" &&
                  pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t">
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name ?? "Student"}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
