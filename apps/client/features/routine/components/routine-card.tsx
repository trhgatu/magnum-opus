import type { RoutineResponse } from "@repo/contracts";
import { Archive, ListChecks } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export function RoutineCard({ routine }: { routine: RoutineResponse }) {
  const habitCount = routine.habitIds.length;

  return (
    <Link
      href={`/routines/${routine.id}`}
      aria-label={`Mở Routine: ${routine.title}`}
      className="group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-3"
    >
      <article className="flex min-h-48 flex-col rounded-2xl border bg-card/70 p-5 shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-primary/35">
        <header className="flex items-start justify-between gap-3">
          <ListChecks className="size-5 text-primary" aria-hidden="true" />
          {routine.isActive ? (
            <Badge variant="outline">Đang hoạt động</Badge>
          ) : (
            <Badge variant="secondary">
              <Archive aria-hidden="true" /> Đã lưu trữ
            </Badge>
          )}
        </header>
        <h2 className="mt-5 text-xl font-semibold tracking-tight group-hover:text-primary">
          {routine.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {habitCount > 0
            ? `${habitCount} thói quen được sắp theo một nhịp có chủ ý.`
            : "Chưa có thói quen nào trong Routine này."}
        </p>
        <footer className="mt-auto pt-6 font-mono text-xs text-foreground/60">
          Revision {routine.revision}
        </footer>
      </article>
    </Link>
  );
}
