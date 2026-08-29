import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface ContextHeroProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  id?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ContextHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  id,
  meta,
  actions,
  className,
}: ContextHeroProps) {
  return (
    <header
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border bg-card/80 px-5 py-6 shadow-sm sm:px-8 sm:py-8",
        className,
      )}
    >
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {eyebrow}
            </p>
            <span className="h-px w-10 bg-primary/25" aria-hidden="true" />
          </div>

          <h1
            id={id}
            className="font-display text-4xl font-semibold leading-none tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl"
          >
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {description}
          </p>
          {meta ? (
            <div className="mt-6 flex flex-wrap gap-2">{meta}</div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
