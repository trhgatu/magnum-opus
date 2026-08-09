import { cn } from "@/lib/utils";

interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  id,
  actions,
  className,
}: PageHeadingProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1
          id={id}
          className="font-display text-4xl font-semibold leading-none tracking-[-0.025em] sm:text-5xl"
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
