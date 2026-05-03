"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleFavoriteSubject } from "@/app/actions/subjects";

interface Subject {
  id: string;
  name: string;
  color: string;
  examBoard: string | null;
  country: string;
  _count: { topics: number };
}

interface Props {
  subjects: Subject[];
  initialFavoriteIds: string[];
}

export function SubjectsGrid({ subjects, initialFavoriteIds }: Props) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialFavoriteIds)
  );
  const [, startTransition] = useTransition();

  // Favorites first, then original sort order
  const sorted = [...subjects].sort((a, b) => {
    const aFav = favoriteIds.has(a.id) ? 0 : 1;
    const bFav = favoriteIds.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  function handleToggle(subjectId: string) {
    const wasFav = favoriteIds.has(subjectId);
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
    startTransition(() => {
      toggleFavoriteSubject(subjectId).then((result) => {
        if ("error" in result) {
          // Revert on error
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (wasFav) next.add(subjectId);
            else next.delete(subjectId);
            return next;
          });
        }
      });
    });
  }

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-gray-400">No subjects available yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((subject) => {
        const isFavorite = favoriteIds.has(subject.id);
        return (
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
                <button
                  onClick={() => handleToggle(subject.id)}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  className="p-1 rounded hover:bg-gray-100 transition-colors shrink-0 mt-0.5"
                >
                  <Star
                    className={`h-4 w-4 transition-colors ${
                      isFavorite
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 hover:text-gray-400"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {subject._count.topics} topic{subject._count.topics !== 1 ? "s" : ""}
                {isFavorite && (
                  <span className="ml-2 text-yellow-500 font-medium">★ Favorite</span>
                )}
              </p>
              <Button size="sm" className="w-full" asChild>
                <Link href={`/test/new?subject=${subject.id}`}>
                  Start Test <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
