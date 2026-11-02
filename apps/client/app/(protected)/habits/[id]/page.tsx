import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getHabit, getHabitOverviewItem } from "@/features/habit/api/habit";
import { HabitDetail } from "@/features/habit/components/habit-detail";
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
  let loaded: Awaited<ReturnType<typeof load>>;
  try {
    loaded = await load(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    )
      notFound();
    throw error;
  }

  return <HabitDetail habit={loaded[0]} overview={loaded[1]} />;
}

// Định nghĩa (để sửa, lưu trữ) và tổng quan (chuỗi, 13 tuần) tải song song.
function load(id: string) {
  return Promise.all([getHabit(id), getHabitOverviewItem(id)]);
}
