import { PanelLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/system/brand-mark";
import { ContextNavigation } from "@/features/navigation/components/context-navigation";

export function AppSidebar() {
  return (
    <aside className="group/sidebar surface-glass sticky top-0 hidden h-screen w-[17rem] shrink-0 flex-col border-r border-sidebar-border transition-[width] duration-200 has-[input:checked]:w-20 motion-reduce:transition-none lg:flex">
      <input
        id="desktop-sidebar-collapsed"
        type="checkbox"
        aria-label="Thu gọn hoặc mở rộng thanh điều hướng"
        className="sr-only"
      />

      <div className="relative flex min-h-20 items-center border-b border-sidebar-border px-5 group-has-[input:checked]/sidebar:justify-center group-has-[input:checked]/sidebar:px-3">
        <Link
          href="/"
          aria-label="Magnum Opus"
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <BrandMark className="size-9 shrink-0" />
          <span className="min-w-0 group-has-[input:checked]/sidebar:hidden">
            <span className="block font-display font-semibold tracking-tight">
              Magnum Opus
            </span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Personal system
            </span>
          </span>
        </Link>

        <label
          htmlFor="desktop-sidebar-collapsed"
          title="Thu gọn hoặc mở rộng thanh điều hướng"
          className="absolute -right-3 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-sidebar-border bg-background text-foreground shadow-sm outline-none transition-colors hover:bg-muted group-has-[input:focus-visible]/sidebar:ring-2 group-has-[input:focus-visible]/sidebar:ring-sidebar-ring group-has-[input:focus-visible]/sidebar:ring-offset-2"
        >
          <PanelLeft className="size-4" aria-hidden="true" />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 group-has-[input:checked]/sidebar:px-2">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground group-has-[input:checked]/sidebar:hidden">
          Không gian
        </p>
        <ContextNavigation />
      </div>

      <div className="border-t border-sidebar-border px-5 py-4 text-xs leading-5 text-muted-foreground group-has-[input:checked]/sidebar:flex group-has-[input:checked]/sidebar:justify-center group-has-[input:checked]/sidebar:px-2">
        <span className="group-has-[input:checked]/sidebar:hidden">
          Capture · Reflect · Transform
        </span>
        <span
          title="Capture · Reflect · Transform"
          className="hidden size-8 place-items-center rounded-lg group-has-[input:checked]/sidebar:grid"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          <span className="sr-only">Capture · Reflect · Transform</span>
        </span>
      </div>
    </aside>
  );
}
