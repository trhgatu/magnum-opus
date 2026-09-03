"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function RoutinesError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Nếp sinh hoạt"
      title="Nếp sinh hoạt chưa thể mở"
      reset={reset}
    />
  );
}
