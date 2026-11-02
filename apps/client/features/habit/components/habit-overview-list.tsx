import type { HabitOverviewResponse } from "@repo/contracts";

import { HabitOverviewRow } from "@/features/habit/components/habit-overview-row";
import {
  describeHabitOverview,
  groupHabitOverview,
} from "@/features/habit/lib/habit-overview";

export function HabitOverviewList({
  overview,
  habits,
}: {
  overview: Pick<HabitOverviewResponse, "date" | "timeZone">;
  habits: HabitOverviewResponse["habits"];
}) {
  const context = { today: overview.date, timeZone: overview.timeZone };

  return (
    <div className="flex flex-col gap-8">
      {groupHabitOverview(habits).map((group) => (
        <section
          key={group.key}
          aria-labelledby={`habit-group-${group.key}`}
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-baseline gap-3">
            <h2
              id={`habit-group-${group.key}`}
              className="font-display text-[22px] leading-tight font-medium"
            >
              {group.title}
            </h2>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {group.items.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {group.items.map((habit) => (
              <HabitOverviewRow
                key={habit.id}
                habit={habit}
                description={describeHabitOverview(habit, context)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
