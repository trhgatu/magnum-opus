import type { HabitResponse } from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/system/page-heading";
import { getHabit } from "@/features/habit/api/habit";
import { HabitEditor } from "@/features/habit/components/habit-editor";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Chỉnh sửa thói quen",
  robots: { index: false, follow: false },
};

export default async function EditHabitPage({
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
  if (!habit.isActive) notFound();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeading
        eyebrow="Forge · Habits"
        title="Chỉnh sửa thói quen"
        description="Thay đổi định nghĩa hoặc lịch thực hiện mà không làm mất lịch sử check-in."
      />
      <HabitEditor initialHabit={habit} />
    </section>
  );
}
