export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { BookOpen, Trophy, Flame, Target, ArrowRight, PlusCircle, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SubjectsGrid } from "@/components/dashboard/subjects-grid";

export default async function DashboardPage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  // Fetch recent sessions
  const recentSessions = await prisma.testSession.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 5,
    include: { subject: true },
  });

  // Fetch subjects
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { topics: true } } },
  });

  // Fetch user's favorite subject IDs
  const favoriteSubjects = await prisma.userFavoriteSubject.findMany({
    where: { userId: user.id },
    select: { subjectId: true },
  });
  const favoriteSubjectIds = favoriteSubjects.map((f) => f.subjectId);

  // Fetch streak and points
  const streak = await prisma.streak.findUnique({ where: { userId: user.id } });
  const totalPoints = streak?.totalPoints ?? 0;
  const currentStreak = streak?.currentStreak ?? 0;

  // Stats
  const totalTests = await prisma.testSession.count({
    where: { userId: user.id, completedAt: { not: null } },
  });
  const avgScore =
    recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((acc: number, s: { scorePercent: number | null }) => acc + (s.scorePercent ?? 0), 0) /
            recentSessions.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Ready to practice? Pick a subject and start.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTests}</p>
                <p className="text-xs text-gray-500">Tests taken</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-xs text-gray-500">Avg score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentStreak}</p>
                <p className="text-xs text-gray-500">Day streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                <p className="text-xs text-gray-500">XP Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subjects grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Quick actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <Link href="/practice">
            <Card className="hover:shadow-md transition-all border-l-4 border-l-indigo-500 cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm group-hover:text-indigo-600 transition-colors">
                    Real Practice Test
                  </p>
                  <p className="text-xs text-gray-500">Full AP exam: 60 MCQ + 3 FRQ with timer</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 ml-auto transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/test/new">
            <Card className="hover:shadow-md transition-all border-l-4 border-l-green-500 cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm group-hover:text-green-600 transition-colors">
                    Quick MCQ Quiz
                  </p>
                  <p className="text-xs text-gray-500">Practice individual topics, any subject</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-500 ml-auto transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Subjects grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Choose a subject</h2>
          <p className="text-xs text-gray-400">★ to pin favorites to the top</p>
        </div>
        <SubjectsGrid subjects={subjects} initialFavoriteIds={favoriteSubjectIds} />
      </div>

      {/* Recent tests */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent tests</h2>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: session.subject.color }}
                  >
                    {Math.round(session.scorePercent ?? 0)}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{session.subject.name}</p>
                    <p className="text-xs text-gray-400">
                      {session.correctCount ?? 0}/{session.totalQuestions ?? 0} correct
                      {" · "}
                      {session.completedAt
                        ? formatDistanceToNow(new Date(session.completedAt), { addSuffix: true })
                        : ""}
                    </p>
                  </div>
                  <Progress
                    value={session.scorePercent ?? 0}
                    className="w-16 h-2 hidden sm:block"
                  />
                  <Button size="sm" variant="ghost" asChild className="shrink-0">
                    <Link href={`/test/${session.id}/review`}>Review</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/test/history">View all tests <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </div>
      )}

      {recentSessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <PlusCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tests yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Pick a subject above to take your first test!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
