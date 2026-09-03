"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function TodayError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Hôm nay"
      title="Hôm nay chưa thể mở"
      reset={reset}
    />
  );
}
