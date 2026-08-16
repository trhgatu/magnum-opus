import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface ProductSpace {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  status: "available" | "planned";
  items: readonly NavigationItem[];
}
