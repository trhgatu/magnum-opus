import type { NavigationItem } from "@/features/navigation/types/navigation.types";

export const isNavigationItemActive = (
  pathname: string,
  item: Pick<NavigationItem, "href">,
) => pathname === item.href || pathname.startsWith(`${item.href}/`);

export const isProductSpaceActive = (
  pathname: string,
  space: { items: readonly Pick<NavigationItem, "href">[] },
) => space.items.some((item) => isNavigationItemActive(pathname, item));
