import {
  BookOpenText,
  Flame,
  FolderKanban,
  Gem,
  Hammer,
  History,
  ListChecks,
  Repeat2,
  Sparkles,
} from "lucide-react";
import type { ProductSpace } from "@/features/navigation/types/navigation.types";

export const productNavigation = [
  {
    id: "reflection",
    label: "Phản chiếu",
    description: "Ghi lại, nhìn lại và giữ những điều có ý nghĩa.",
    icon: Sparkles,
    status: "available",
    items: [
      { id: "journal", label: "Journal", href: "/journal", icon: BookOpenText },
      { id: "memories", label: "Memories", href: "/memories", icon: Gem },
      { id: "timeline", label: "Timeline", href: "/timeline", icon: History },
    ],
  },
  {
    id: "forge",
    label: "Forge",
    description: "Rèn những hành động nhỏ thành nhịp sống có chủ ý.",
    icon: Flame,
    status: "available",
    items: [
      { id: "habits", label: "Habits", href: "/habits", icon: Repeat2 },
      {
        id: "routines",
        label: "Routines",
        href: "/routines",
        icon: ListChecks,
      },
    ],
  },
  {
    id: "engineering",
    label: "Engineering",
    description: "Biến ý tưởng kỹ thuật thành những công trình có dấu vết.",
    icon: Hammer,
    status: "planned",
    items: [
      {
        id: "projects",
        label: "Projects",
        href: "/engineering/projects",
        icon: FolderKanban,
      },
    ],
  },
] as const satisfies readonly ProductSpace[];

export const availableProductNavigation = productNavigation.filter(
  (space) => space.status === "available",
);
