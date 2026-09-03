"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";

export function RouteErrorState({
  ariaLabel,
  title,
  reset,
}: {
  ariaLabel: string;
  title: string;
  reset: () => void;
}) {
  return (
    <section className="py-8" aria-label={ariaLabel}>
      <EmptyState
        title={title}
        description="Dữ liệu vẫn được giữ nguyên. Có thể kết nối đang gián đoạn; thử tải lại trước khi quay về không gian chính."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={reset}>
              <RefreshCcw aria-hidden="true" />
              Thử lại
            </Button>

            <Link href="/me" className={buttonVariants({ variant: "outline" })}>
              Về không gian chính
            </Link>
          </div>
        }
      />
    </section>
  );
}
