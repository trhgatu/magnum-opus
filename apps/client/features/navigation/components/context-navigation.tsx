"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { availableProductNavigation } from "@/features/navigation/config/product-navigation";
import {
  isNavigationItemActive,
  isProductSpaceActive,
} from "@/features/navigation/lib/navigation-state";
import { cn } from "@/lib/utils";

interface ContextNavigationProps {
  onNavigate?: () => void;
}

export function ContextNavigation({ onNavigate }: ContextNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Không gian sản phẩm" className="space-y-3">
      {availableProductNavigation.map((space) => {
        const isSpaceActive = isProductSpaceActive(pathname, space);
        const SpaceIcon = space.icon;

        return (
          <details
            key={space.id}
            open={isSpaceActive || undefined}
            className="group rounded-2xl border border-sidebar-border/70 bg-sidebar/55 open:bg-sidebar-accent/25 group-has-[input:checked]/sidebar:border-transparent group-has-[input:checked]/sidebar:bg-transparent group-has-[input:checked]/sidebar:open:bg-transparent"
          >
            <summary
              title={space.label}
              className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-3 outline-none transition-colors hover:bg-sidebar-accent/45 focus-visible:ring-2 focus-visible:ring-sidebar-ring group-has-[input:checked]/sidebar:justify-center group-has-[input:checked]/sidebar:px-0 [&::-webkit-details-marker]:hidden"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl border bg-background/70 text-muted-foreground",
                  isSpaceActive &&
                    "border-sidebar-primary/30 bg-sidebar-primary/10 text-sidebar-primary",
                )}
              >
                <SpaceIcon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 group-has-[input:checked]/sidebar:hidden">
                <span className="block text-sm font-semibold">
                  {space.label}
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                  {space.description}
                </span>
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 group-has-[input:checked]/sidebar:hidden"
                aria-hidden="true"
              />
            </summary>

            <div className="space-y-1 px-2 pb-2 group-has-[input:checked]/sidebar:px-0">
              {space.items.map((item) => {
                const isActive = isNavigationItemActive(pathname, item);
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-has-[input:checked]/sidebar:justify-center group-has-[input:checked]/sidebar:px-0",
                      isActive &&
                        "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                    )}
                  >
                    <ItemIcon className="size-4" aria-hidden="true" />
                    <span className="group-has-[input:checked]/sidebar:hidden">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
