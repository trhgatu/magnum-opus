"use client";

import { Menu, X } from "lucide-react";
import { useRef } from "react";

import { BrandMark } from "@/components/system/brand-mark";
import { Button } from "@/components/ui/button";
import { ContextNavigation } from "@/features/navigation/components/context-navigation";

export function MobileNavigation() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Mở điều hướng"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Menu aria-hidden="true" />
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="mobile-navigation-title"
        className="m-0 h-dvh w-[min(22rem,88vw)] max-w-none border-r bg-popover p-0 text-popover-foreground shadow-2xl backdrop:bg-black/25 backdrop:backdrop-blur-xs open:flex open:flex-col"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
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
            onClick={close}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <ContextNavigation onNavigate={close} />
        </div>
      </dialog>
    </>
  );
}
