import type {
  HabitCheckInHistoryResponse,
  HabitCheckInTodayResponse,
  HabitResponse,
} from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getHabit,
  getHabitCheckInHistory,
  getHabitCheckInToday,
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
  let today: HabitCheckInTodayResponse;
  let history: HabitCheckInHistoryResponse;
  try {
    const loaded = await Promise.all([getHabit(id), getHabitCheckInToday(id)]);
    habit = loaded[0];
    today = loaded[1];
    const range = habitHistoryRange(today.date);
    history = await getHabitCheckInHistory(id, range.from, range.to);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    )
      notFound();
    throw error;
  }

  return <HabitDetail habit={habit} today={today} history={history} />;
}
