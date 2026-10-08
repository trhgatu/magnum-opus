"use client";

import { PanelLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/system/brand-mark";
import { ContextNavigation } from "@/features/navigation/components/context-navigation";
import { useSidebar } from "@/features/navigation/components/sidebar-provider";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "surface-glass sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border transition-[width] duration-200 motion-reduce:transition-none lg:flex",
        collapsed ? "w-20" : "w-[17rem]",
      )}
    >
      <div
        className={cn(
          "relative flex min-h-20 items-center border-b border-sidebar-border px-5",
          collapsed && "justify-center px-3",
        )}
      >
        <Link
          href="/"
          aria-label="Magnum Opus"
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <BrandMark className="size-9 shrink-0" />
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block font-display font-semibold tracking-tight">
                Magnum Opus
              </span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Personal system
              </span>
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          title="Thu gọn hoặc mở rộng thanh điều hướng"
          aria-label="Thu gọn hoặc mở rộng thanh điều hướng"
          aria-pressed={collapsed}
          onClick={toggleCollapsed}
          className="absolute -right-3 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-sidebar-border bg-background text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2"
        >
          <PanelLeft className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-3 py-5",
          collapsed && "px-2",
        )}
      >
        {!collapsed ? (
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Không gian
          </p>
        ) : null}
        <ContextNavigation collapsed={collapsed} />
      </div>

      <div
        className={cn(
          "border-t border-sidebar-border px-5 py-4 text-xs leading-5 text-muted-foreground",
          collapsed && "flex justify-center px-2",
        )}
      >
        {!collapsed ? (
          <span>Capture · Reflect · Transform</span>
        ) : (
          <span
            title="Capture · Reflect · Transform"
            className="grid size-8 place-items-center rounded-lg"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            <span className="sr-only">Capture · Reflect · Transform</span>
          </span>
        )}
      </div>
    </aside>
  );
}
