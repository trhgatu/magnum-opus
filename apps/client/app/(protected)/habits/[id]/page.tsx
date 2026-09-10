import type { HabitResponse } from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getHabit,
  getHabitCheckInHistory,
  getHabitCheckInToday,
  getHabitProgress,
} from "@/features/habit/api/habit";
import { HabitDetail } from "@/features/habit/components/habit-detail";
import { habitHistoryRange } from "@/features/habit/lib/habit-frequency";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Thói quen",
  robots: { index: false, follow: false },
};

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let habit: HabitResponse;
  try {
    habit = await getHabit(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    )
      notFound();
    throw error;
  }

  if (habit.type === "QUIT") {
    const progress = await getHabitProgress(id);
    return <HabitDetail habit={habit} progress={progress} />;
  }

  const today = await getHabitCheckInToday(id);
  const range = habitHistoryRange(today.date);
  const history = await getHabitCheckInHistory(id, range.from, range.to);

  return <HabitDetail habit={habit} today={today} history={history} />;
}
