import {
  Ban,
  CheckCircle2,
  Circle,
  FolderKanban,
  Pause,
  Square,
} from "lucide-react";
import Link from "next/link";

import {
  buildProjectHref,
  parseProjectLocation,
} from "@/features/project/lib/project-url";
import { cn } from "@/lib/utils";

const STATE_FILTERS = [
  { value: undefined, label: "Tất cả", icon: Ban },
  { value: "NOT_STARTED", label: "Chưa bắt đầu", icon: Circle },
  { value: "ACTIVE", label: "Đang chạy", icon: FolderKanban },
  { value: "PAUSED", label: "Tạm dừng", icon: Pause },
  { value: "STOPPED", label: "Đã dừng", icon: Square },
  { value: "COMPLETED", label: "Hoàn thành", icon: CheckCircle2 },
] as const;

export function ProjectCollectionControls({
  location,
}: {
  location: ReturnType<typeof parseProjectLocation>;
}) {
  return (
    <nav
      aria-label="Lọc trạng thái Project"
      className="flex flex-wrap gap-1 rounded-xl border bg-background/70 p-1"
    >
      {STATE_FILTERS.map(({ value, label, icon: Icon }) => (
        <Link
          key={label}
          href={buildProjectHref({ ...location, page: 1, state: value })}
          aria-current={location.state === value ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
            location.state === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
