import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/45 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-5 grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
        <CircleDashed className="size-5" aria-hidden="true" />
      </span>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
