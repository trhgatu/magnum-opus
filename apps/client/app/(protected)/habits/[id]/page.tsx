import type {
  HabitCheckInHistoryResponse,
  HabitCheckInTodayResponse,
  HabitProgressResponse,
  HabitResponse,
} from "@repo/contracts";
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

type LoadedHabitDetail =
  | {
      habit: HabitResponse;
      today: HabitCheckInTodayResponse;
      history: HabitCheckInHistoryResponse;
      progress?: never;
    }
  | {
      habit: HabitResponse;
      progress: HabitProgressResponse;
      today?: never;
      history?: never;
    };

async function loadHabitDetail(id: string): Promise<LoadedHabitDetail> {
  const habit = await getHabit(id);

  if (habit.type === "QUIT") {
    const progress = await getHabitProgress(id);
    return { habit, progress };
  }

  const today = await getHabitCheckInToday(id);
  const range = habitHistoryRange(today.date);
  const history = await getHabitCheckInHistory(id, range.from, range.to);

  return { habit, today, history };
}

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let loaded: LoadedHabitDetail;
  try {
    loaded = await loadHabitDetail(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    )
      notFound();
    throw error;
  }

  return <HabitDetail {...loaded} />;
}
