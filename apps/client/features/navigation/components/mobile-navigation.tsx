"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { BrandMark } from "@/components/system/brand-mark";
import { Button } from "@/components/ui/button";
import { ContextNavigation } from "@/features/navigation/components/context-navigation";
import { useSidebar } from "@/features/navigation/components/sidebar-provider";

export function MobileNavigation() {
  const { mobileOpen, openMobile, closeMobile } = useSidebar();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // `<dialog>` cần gọi showModal()/close() bằng imperative API — state
  // `mobileOpen` ở SidebarProvider là nguồn sự thật duy nhất, effect này
  // chỉ đồng bộ DOM theo state đó (kể cả khi đóng bằng phím Esc, dialog tự
  // bắn sự kiện "close" bên dưới để state không bị lệch ngược lại).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (mobileOpen && !dialog.open) {
      dialog.showModal();
    } else if (!mobileOpen && dialog.open) {
      dialog.close();
    }
  }, [mobileOpen]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Mở điều hướng"
        aria-haspopup="dialog"
        onClick={openMobile}
      >
        <Menu aria-hidden="true" />
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="mobile-navigation-title"
        className="m-0 h-dvh w-[min(22rem,88vw)] max-w-none border-r bg-popover p-0 text-popover-foreground shadow-2xl backdrop:bg-black/25 backdrop:backdrop-blur-xs open:flex open:flex-col"
        onClose={closeMobile}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMobile();
        }}
      >
        <div className="flex items-start gap-3 border-b px-5 py-5">
          <BrandMark className="size-9" />
          <div className="min-w-0 flex-1">
            <h2
              id="mobile-navigation-title"
              className="font-display font-medium"
            >
              Magnum Opus
            </h2>
            <p className="text-sm text-muted-foreground">
              Chọn không gian muốn bước vào.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Đóng điều hướng"
            onClick={closeMobile}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <ContextNavigation onNavigate={closeMobile} />
        </div>
      </dialog>
    </>
  );
}
