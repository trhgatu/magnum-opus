import type { HabitOverviewResponse, HabitType } from "@repo/contracts";
import { ChevronRight } from "lucide-react";

import { HabitOverviewRow } from "@/features/habit/components/habit-overview-row";
import {
  describeHabitOverview,
  groupHabitOverview,
} from "@/features/habit/lib/habit-overview";

/**
 * Tab Xây dựng: "Còn chờ hôm nay" luôn mở; nhóm đã ghi dấu và không có lịch
 * gập sẵn (`<details>`), nên trang chỉ dài bằng số việc còn phải làm. Trạng
 * thái mở/đóng do trình duyệt giữ, không mất khi ghi dấu làm trang refresh.
 * Tab Từ bỏ: danh sách phẳng theo tên.
 */
export function HabitOverviewList({
  overview,
  habits,
  type,
  searching = false,
}: {
  overview: Pick<HabitOverviewResponse, "date" | "timeZone">;
  habits: HabitOverviewResponse["habits"];
  type: HabitType;
  /** Đang lọc theo từ khóa: câu "không còn việc" chỉ nói về kết quả tìm. */
  searching?: boolean;
}) {
  const context = { today: overview.date, timeZone: overview.timeZone };
  const rows = (items: HabitOverviewResponse["habits"]) => (
    <ul className="flex flex-col gap-2">
      {items.map((habit) => (
        <HabitOverviewRow
          key={habit.id}
          habit={habit}
          description={describeHabitOverview(habit, context)}
        />
      ))}
    </ul>
  );

  if (type === "QUIT") return rows(habits);

  const groups = groupHabitOverview(habits);
  return (
    <div className="flex flex-col gap-6">
      {groups.some((group) => group.key === "pending") ? null : (
        <p className="font-display text-[22px] leading-tight">
          {searching
            ? "Không có việc nào còn chờ trong kết quả tìm."
            : "Hôm nay không còn việc nào chờ."}
        </p>
      )}
      {groups.map((group) =>
        group.key === "pending" ? (
          <section
            key={group.key}
            aria-labelledby="habit-group-pending"
            className="flex flex-col gap-2.5"
          >
            <div className="flex items-baseline gap-3">
              <h2
                id="habit-group-pending"
                className="font-display text-[22px] leading-tight font-medium"
              >
                {group.title}
              </h2>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {group.items.length}
              </span>
            </div>
            {rows(group.items)}
          </section>
        ) : (
          <details key={group.key} className="group/fold flex flex-col">
            <summary className="flex cursor-pointer list-none items-center gap-2 self-start rounded-md py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-4 transition-transform group-open/fold:rotate-90 motion-reduce:transition-none"
                aria-hidden="true"
              />
              <h2 className="flex items-baseline gap-2">
                <span className="font-display text-lg font-medium">
                  {group.title}
                </span>
                <span className="font-mono text-xs tabular-nums">
                  {group.items.length}
                </span>
              </h2>
            </summary>
            <div className="pt-2.5">{rows(group.items)}</div>
          </details>
        ),
      )}
    </div>
  );
}
