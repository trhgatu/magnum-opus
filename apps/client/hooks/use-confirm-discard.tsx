"use client";

import dynamic from "next/dynamic";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const loadDiscardDialog = () => import("@/components/system/discard-dialog");

// Chunk riêng: không nằm trong bundle đầu của trang, nhưng tải sẵn ngay khi
// trang có form (xem useEffect bên dưới) để lần hỏi đầu không bị chậm.
const DiscardDialog = dynamic(loadDiscardDialog, { ssr: false });

/**
 * Hỏi trước khi bỏ phần đang viết, bằng hộp thoại của app thay cho
 * `window.confirm`. `confirmDiscard()` trả về true khi người dùng chọn bỏ.
 * Nơi gọi phải render `discardDialog`.
 */
export function useConfirmDiscard(
  description = "Nội dung chưa được lưu. Đóng lúc này sẽ làm mất phần đang viết.",
): { confirmDiscard: () => Promise<boolean>; discardDialog: ReactNode } {
  const [open, setOpen] = useState(false);
  // Giữ hộp thoại trong cây sau lần mở đầu, để nó đóng có hiệu ứng.
  const [mounted, setMounted] = useState(false);
  const resolveRef = useRef<((discard: boolean) => void) | null>(null);

  useEffect(() => {
    void loadDiscardDialog();
  }, []);

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
        setMounted(true);
        setOpen(true);
      }),
    [],
  );

  const discardDialog = mounted ? (
    <DiscardDialog open={open} description={description} onSettle={settle} />
  ) : null;

  return { confirmDiscard, discardDialog };
}
