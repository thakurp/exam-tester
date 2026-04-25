export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Upload, Sparkles, Users, FileText, BarChart, FolderOpen } from "lucide-react";

export default async function AdminDashboard() {
  const [questionCount, subjectCount, sessionCount, userCount] = await Promise.all([
    prisma.question.count({ where: { status: "PUBLISHED" } }),
    prisma.subject.count({ where: { isActive: true } }),
    prisma.testSession.count({ where: { completedAt: { not: null } } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
  ]);

  const recentQuestions = await prisma.question.findMany({
    where: { status: "DRAFT" },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { topic: { include: { subject: true } } },
  });

  const stats = [
    { label: "Published Questions", value: questionCount, icon: BookOpen, color: "text-indigo-600 bg-indigo-100" },
    { label: "Active Subjects", value: subjectCount, icon: BarChart, color: "text-violet-600 bg-violet-100" },
    { label: "Tests Completed", value: sessionCount, icon: FileText, color: "text-green-600 bg-green-100" },
    { label: "Students", value: userCount, icon: Users, color: "text-amber-600 bg-amber-100" },
  ];

  const quickActions = [
    { label: "Upload CSV/Excel", href: "/admin/upload", icon: Upload, desc: "Bulk import questions from spreadsheet" },
    { label: "AI Generate Questions", href: "/admin/generate", icon: Sparkles, desc: "Generate new questions with AI" },
    { label: "Manage Questions", href: "/admin/questions", icon: BookOpen, desc: "View, edit, and publish questions" },
    { label: "Manage Subjects", href: "/admin/subjects", icon: BarChart, desc: "Configure subjects and topics" },
    { label: "Source Documents", href: "/admin/source-documents", icon: FolderOpen, desc: "Register and manage official papers, rubrics, and guidelines" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage questions, subjects, and content.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card key={action.href} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <action.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{action.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
                  </div>
                </div>
                <Button size="sm" className="w-full mt-4" asChild>
                  <Link href={action.href}>Go →</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Draft questions pending review */}
      {recentQuestions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Draft Questions ({recentQuestions.length})</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/questions?status=DRAFT">View all drafts</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {recentQuestions.map((q) => (
              <Card key={q.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.stem}</p>
                    <p className="text-xs text-gray-400">{q.topic.subject.name} › {q.topic.name}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/questions/${q.id}/edit`}>Edit</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
