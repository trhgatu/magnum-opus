import { PageHeading } from "@/components/system/page-heading";
import { Skeleton } from "@/components/ui/skeleton";

interface FormSkeletonProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function FormSkeleton({
  eyebrow,
  title,
  description,
}: FormSkeletonProps) {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang chuẩn bị biểu mẫu…</span>

      <PageHeading eyebrow={eyebrow} title={title} description={description} />

      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border bg-card/55 p-5 shadow-sm sm:p-8"
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-56" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </section>
  );
}
