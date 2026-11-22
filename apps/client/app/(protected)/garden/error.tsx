"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function GardenError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Khu vườn"
      title="Khu vườn chưa thể mở"
      reset={reset}
    />
  );
}
