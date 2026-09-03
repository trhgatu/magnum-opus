"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function MeError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Hồ sơ cá nhân"
      title="Hồ sơ cá nhân chưa thể mở"
      reset={reset}
    />
  );
}
