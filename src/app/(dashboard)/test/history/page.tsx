export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { BarChart, Clock, Trophy } from "lucide-react";

export default async function TestHistoryPage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const sessions = await prisma.testSession.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 50,
    include: { subject: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test History</h1>
        <p className="text-gray-500 mt-1">{sessions.length} completed tests</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tests taken yet</p>
            <Button className="mt-4" asChild>
              <Link href="/test/new">Start your first test</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {

            return (
              <Card key={s.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{s.subject.name}</p>
                      <Badge variant="outline" className="text-xs">{s.mode}</Badge>
                    </div>
                    <Progress value={s.scorePercent ?? 0} className="h-1.5 mt-1.5 mb-1" />
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> {s.correctCount ?? 0}/{s.totalQuestions ?? 0} ({Math.round(s.scorePercent ?? 0)}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.completedAt ? format(new Date(s.completedAt), "dd MMM yyyy, h:mm a") : "—"}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/test/${s.id}/review`}>Review</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
