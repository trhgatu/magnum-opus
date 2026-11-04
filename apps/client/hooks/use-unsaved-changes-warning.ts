"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

import { useConfirmDiscard } from "@/hooks/use-confirm-discard";

/**
 * Cảnh báo trước khi rời trang khi còn phần chưa lưu. Bấm link nội bộ thì hỏi
 * bằng hộp thoại của app (nơi gọi render giá trị trả về). Đóng tab hay tải
 * lại thì trình duyệt chỉ cho hộp thoại của chính nó (`beforeunload`).
 */
export function useUnsavedChangesWarning(enabled: boolean): ReactNode {
  const router = useRouter();
  // Ref, không phải biến trong effect: effect có thể chạy lại giữa lúc hỏi
  // và lúc bấm lại link, listener mới vẫn phải thấy cờ này.
  const replayingRef = useRef(false);
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
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
      // Bấm lại link sau khi người dùng chọn bỏ: lần đó cho qua, để Link và
      // các onClick của nó (vd đóng menu) chạy như bình thường.
      if (replayingRef.current) {
        replayingRef.current = false;
        return;
      }
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
        if (!discard) return;
        if (anchor.isConnected) {
          replayingRef.current = true;
          anchor.click();
        } else {
          // Link đã biến mất (vd menu đóng lại khi hộp thoại mở): đi thẳng.
          routerRef.current.push(
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
  }, [enabled, confirmDiscard]);

  return discardDialog;
}
