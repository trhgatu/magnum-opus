"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function HabitsError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Thói quen"
      title="Thói quen chưa thể mở"
      reset={reset}
    />
  );
}
