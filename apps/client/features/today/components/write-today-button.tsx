"use client";

import { PenLine } from "lucide-react";
import { useFormStatus } from "react-dom";

/** Nút tạo trang nhật ký hôm nay; khóa khi đang gửi để không tạo hai trang. */
export function WriteTodayButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      <PenLine className="size-4" aria-hidden="true" />
      {pending ? "Đang mở trang viết…" : "Viết trang hôm nay"}
    </button>
  );
}
