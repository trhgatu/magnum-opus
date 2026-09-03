"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function TimelineError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Dòng thời gian"
      title="Dòng thời gian chưa thể mở"
      reset={reset}
    />
  );
}
