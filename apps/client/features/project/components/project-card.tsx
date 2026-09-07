import type { ProjectResponse } from "@repo/contracts";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  FolderKanban,
  Pause,
  Square,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const STATE_BADGE = {
  NOT_STARTED: {
    variant: "outline",
    icon: Circle,
    label: "Chưa bắt đầu",
  },
  ACTIVE: {
    variant: "default",
    icon: FolderKanban,
    label: "Đang chạy",
  },
  PAUSED: {
    variant: "secondary",
    icon: Pause,
    label: "Tạm dừng",
  },
  STOPPED: {
    variant: "destructive",
    icon: Square,
    label: "Đã dừng",
  },
  COMPLETED: {
    variant: "secondary",
    icon: CheckCircle2,
    label: "Hoàn thành",
  },
} as const;

export function ProjectCard({
  project,
  index = 0,
}: {
  project: ProjectResponse;
  index?: number;
}) {
  const state = STATE_BADGE[project.lifecycleState];
  const StateIcon = state.icon;

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`Mở Project: ${project.title}`}
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
              <FolderKanban className="size-4" aria-hidden="true" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Project {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <Badge variant={state.variant}>
            <StateIcon aria-hidden="true" /> {state.label}
          </Badge>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-balance transition-colors group-hover:text-primary">
            {project.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {project.description ?? "Chưa có mô tả cho effort này."}
          </p>

          {project.currentCycle ? (
            <p className="mt-auto pt-7 text-xs text-muted-foreground">
              Cycle {project.currentCycle.cycleNumber}
              {project.currentCycle.intendedOutcome
                ? ` · ${project.currentCycle.intendedOutcome}`
                : " · Chưa xác định outcome"}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end bg-muted/35 px-5 py-3 font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-sans text-xs font-medium text-foreground/70 transition-colors group-hover:text-primary">
            Mở Project <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
