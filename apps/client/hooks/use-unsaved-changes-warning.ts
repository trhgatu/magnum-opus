"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { useConfirmDiscard } from "@/hooks/use-confirm-discard";

/**
 * Cảnh báo trước khi rời trang khi còn phần chưa lưu. Bấm link nội bộ thì hỏi
 * bằng hộp thoại của app (nơi gọi render giá trị trả về). Đóng tab hay tải
 * lại thì trình duyệt chỉ cho hộp thoại của chính nó (`beforeunload`).
 */
export function useUnsavedChangesWarning(enabled: boolean): ReactNode {
  const router = useRouter();
  const { confirmDiscard, discardDialog } = useConfirmDiscard(
    "Nội dung chưa được lưu. Rời trang lúc này sẽ làm mất phần đang viết.",
  );

  useEffect(() => {
    if (!enabled) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const guardInternalLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const changesRoute =
        destination.origin === current.origin &&
        (destination.pathname !== current.pathname ||
          destination.search !== current.search);
      if (!changesRoute) return;

      // Hộp thoại không chặn luồng như window.confirm: dừng điều hướng ngay,
      // chọn "Bỏ thay đổi" thì mới đi tiếp.
      event.preventDefault();
      event.stopImmediatePropagation();
      void confirmDiscard().then((discard) => {
        if (discard) {
          router.push(
            `${destination.pathname}${destination.search}${destination.hash}`,
          );
        }
      });
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", guardInternalLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", guardInternalLink, true);
    };
  }, [enabled, confirmDiscard, router]);

  return discardDialog;
}
