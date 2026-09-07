import {
  BookOpenText,
  Flame,
  FlaskConical,
  FolderKanban,
  Gem,
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
      { id: "journal", label: "Nhật ký", href: "/journal", icon: BookOpenText },
      { id: "memories", label: "Ký ức", href: "/memories", icon: Gem },
      {
        id: "timeline",
        label: "Dòng thời gian",
        href: "/timeline",
        icon: History,
      },
    ],
  },
  {
    id: "forge",
    label: "Forge",
    description: "Rèn những hành động nhỏ thành nhịp sống có chủ ý.",
    icon: Flame,
    status: "available",
    items: [
      {
        id: "today",
        label: "Hôm nay",
        href: "/today",
        icon: Flame,
      },
      { id: "habits", label: "Thói quen", href: "/habits", icon: Repeat2 },
      {
        id: "routines",
        label: "Nếp sinh hoạt",
        href: "/routines",
        icon: ListChecks,
      },
    ],
  },
  {
    id: "crucible",
    label: "Crucible",
    description: "Tôi luyện những effort đủ ý nghĩa để theo đuổi và quan sát.",
    icon: FlaskConical,
    status: "available",
    items: [
      {
        id: "projects",
        label: "Project",
        href: "/projects",
        icon: FolderKanban,
      },
    ],
  },
] as const satisfies readonly ProductSpace[];

export const availableProductNavigation = productNavigation.filter(
  (space) => space.status === "available",
);
