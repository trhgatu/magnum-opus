"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useRef, useState } from "react";

// Chỉ cần khi người dùng bỏ phần đang viết: không kéo AlertDialog vào bundle
// của trang tạo mới hay trang chi tiết.
const DiscardDialog = dynamic(
  () => import("@/components/system/discard-dialog"),
  { ssr: false },
);

/**
 * Hỏi trước khi bỏ phần đang viết, bằng hộp thoại của app thay cho
 * `window.confirm`. `confirmDiscard()` trả về true khi người dùng chọn bỏ.
 * Nơi gọi phải render `discardDialog`.
 */
export function useConfirmDiscard(
  description = "Nội dung chưa được lưu. Đóng lúc này sẽ làm mất phần đang viết.",
): { confirmDiscard: () => Promise<boolean>; discardDialog: ReactNode } {
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((discard: boolean) => void) | null>(null);

  const settle = useCallback((discard: boolean) => {
    resolveRef.current?.(discard);
    resolveRef.current = null;
    setOpen(false);
  }, []);

  const confirmDiscard = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        // Hỏi lại khi đang hỏi: câu hỏi cũ coi như "tiếp tục sửa".
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setOpen(true);
      }),
    [],
  );

  const discardDialog = open ? (
    <DiscardDialog description={description} onSettle={settle} />
  ) : null;

  return { confirmDiscard, discardDialog };
}
