import type { HabitResponse } from "@repo/contracts";
import { Archive, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatHabitFrequency } from "@/features/habit/lib/habit-frequency";

export function HabitCard({ habit }: { habit: HabitResponse }) {
  return (
    <Link
      href={`/habits/${habit.id}`}
      aria-label={`Mở thói quen: ${habit.title}`}
      className="group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-3"
    >
      <article className="flex min-h-52 flex-col rounded-2xl border bg-card/70 p-5 shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-primary/35">
        <header className="flex items-start justify-between gap-3">
          <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
          {habit.isActive ? (
            <Badge variant="outline">Đang rèn luyện</Badge>
          ) : (
            <Badge variant="secondary">
              <Archive aria-hidden="true" /> Đã lưu trữ
            </Badge>
          )}
        </header>
        <h2 className="mt-5 text-xl font-semibold tracking-tight group-hover:text-primary">
          {habit.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {habit.description ?? "Một nhịp lặp đang được vun bồi."}
        </p>
        <footer className="mt-auto pt-6 text-xs font-medium text-foreground/65">
          {formatHabitFrequency(habit.frequencyType, habit.frequencyDays)}
        </footer>
      </article>
    </Link>
  );
}
