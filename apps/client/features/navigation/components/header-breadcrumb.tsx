"use client";

import { usePathname } from "next/navigation";

import { availableProductNavigation } from "@/features/navigation/config/product-navigation";
import { isNavigationItemActive } from "@/features/navigation/lib/navigation-state";

/** Nhãn cho các trang không thuộc `productNavigation` (vd trang tài khoản)
 * — không phải "không gian sản phẩm", nên không nằm trong config điều
 * hướng chính, nhưng vẫn cần 1 tiêu đề trong header. */
const EXTRA_ROUTE_LABELS: Record<string, string> = {
  "/me": "Tài khoản",
};

export function HeaderBreadcrumb() {
  const pathname = usePathname();

  for (const space of availableProductNavigation) {
    const activeItem = space.items.find((item) =>
      isNavigationItemActive(pathname, item),
    );

    if (activeItem) {
      const SpaceIcon = space.icon;

      return (
        <p
          data-testid="header-breadcrumb"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          <SpaceIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="truncate text-muted-foreground">{space.label}</span>
          <span className="text-muted-foreground/50" aria-hidden="true">
            /
          </span>
          <span className="truncate font-medium">{activeItem.label}</span>
        </p>
      );
    }
  }

  const extraLabel = EXTRA_ROUTE_LABELS[pathname];

  return (
    <p
      data-testid="header-breadcrumb"
      className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
    >
      {extraLabel ?? "Không gian riêng"}
    </p>
  );
}
