"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function MemoriesError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Ký ức"
      title="Ký ức chưa thể mở"
      reset={reset}
    />
  );
}
