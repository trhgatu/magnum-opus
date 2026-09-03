"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function JournalError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Nhật ký"
      title="Nhật ký chưa thể mở"
      reset={reset}
    />
  );
}
