export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { BookOpen, Trophy, Flame, Target, ArrowRight, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
          recentSessions.reduce((acc, s) => acc + (s.scorePercent ?? 0), 0) /
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
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
          <h2 className="text-lg font-semibold">Choose a subject</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="hover:shadow-md transition-all cursor-pointer group border-l-4"
              style={{ borderLeftColor: subject.color }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge
                      variant="outline"
                      className="text-xs mb-2"
                      style={{ borderColor: subject.color, color: subject.color }}
                    >
                      {subject.examBoard ?? subject.country}
                    </Badge>
                    <h3 className="font-semibold text-sm group-hover:text-indigo-600 transition-colors">
                      {subject.name}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  {subject._count.topics} topics
                </p>
                <Button size="sm" className="w-full" asChild>
                  <Link href={`/test/new?subject=${subject.id}`}>
                    Start Test <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent tests */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent tests</h2>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4 flex items-center gap-4">
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
                    className="w-20 h-2"
                  />
                  <Button size="sm" variant="ghost" asChild>
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
