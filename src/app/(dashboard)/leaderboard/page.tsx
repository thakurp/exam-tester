export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Trophy, Flame, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default async function LeaderboardPage() {
  const streaks = await prisma.streak.findMany({
    orderBy: { totalPoints: "desc" },
    take: 50,
    include: {
      user: {
        select: { name: true, email: true, avatarUrl: true },
      },
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-500 font-medium uppercase tracking-wide">
            Top Students — All Time
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {streaks.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-10">
              No scores yet. Start practicing!
            </p>
          )}
          {streaks.map((entry, index) => {
            const rank = index + 1;
            const displayName = entry.user.name ?? entry.user.email.split("@")[0];
            const initials = displayName.slice(0, 2).toUpperCase();
            const medal =
              rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-3 sm:px-6 py-3 hover:bg-gray-50"
              >
                <div className="w-8 text-center font-bold text-gray-500 text-sm">
                  {medal ?? `#${rank}`}
                </div>

                <Avatar className="h-9 w-9">
                  {entry.user.avatarUrl && (
                    <AvatarImage src={entry.user.avatarUrl} alt={displayName} />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-sm">
                  {entry.currentStreak > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-orange-500 text-xs">
                      <Flame className="h-3.5 w-3.5" />
                      {entry.currentStreak}d
                    </span>
                  )}
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {entry.totalPoints.toLocaleString()} pts
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
