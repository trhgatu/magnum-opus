"use client";

import { RouteErrorState } from "@/components/system/route-error-state";

export default function SettingsError({ reset }: { reset: () => void }) {
  return (
    <RouteErrorState
      ariaLabel="Lỗi Cài đặt"
      title="Cài đặt chưa thể mở"
      reset={reset}
    />
  );
}
