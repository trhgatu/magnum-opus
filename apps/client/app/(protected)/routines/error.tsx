"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function RoutinesError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Trình tự"
      title="Trình tự chưa thể mở"
      reset={reset}
    />
  );
}
