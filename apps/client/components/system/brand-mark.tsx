import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary shadow-[inset_0_0_0_3px_var(--background)]",
        className,
      )}
    >
      <span className="size-2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
      <span className="absolute inset-1.5 rotate-45 border border-current/55" />
    </span>
  );
}
