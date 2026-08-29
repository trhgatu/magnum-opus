import type { HabitResponse } from "@repo/contracts";
import { Archive, ArrowUpRight, CheckCircle2, Repeat2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { formatHabitFrequency } from "@/features/habit/lib/habit-frequency";

export function HabitCard({
  habit,
  index = 0,
}: {
  habit: HabitResponse;
  index?: number;
}) {
  return (
    <Link
      href={`/habits/${habit.id}`}
      aria-label={`Mở thói quen: ${habit.title}`}
      className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3"
    >
      <Card className="relative min-h-64 gap-0 overflow-hidden rounded-2xl bg-card/75 py-0 transition duration-200 group-hover:-translate-y-1 group-hover:ring-primary/30 group-hover:shadow-lg motion-reduce:transform-none">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-12 size-32 rounded-full border border-primary/10 transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none"
        />
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pb-0 pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Repeat2 className="size-4" aria-hidden="true" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Practice {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          {habit.isActive ? (
            <Badge variant="outline">Đang rèn</Badge>
          ) : (
            <Badge variant="secondary">
              <Archive aria-hidden="true" /> Đã lưu trữ
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-balance transition-colors group-hover:text-primary">
            {habit.title}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {habit.description ?? "Một thói quen đang được vun bồi."}
          </p>
          <div className="mt-auto flex items-center gap-2 pt-7 text-xs font-medium text-foreground/70">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            {formatHabitFrequency(habit.frequencyType, habit.frequencyDays)}
          </div>
        </CardContent>
        <CardFooter className="justify-end bg-muted/35 px-5 py-3 font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-sans text-xs font-medium text-foreground/70 transition-colors group-hover:text-primary">
            Mở Thói quen{" "}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
