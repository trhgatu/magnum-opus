import type { RoutineDetailResponse } from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/system/page-heading";
import { getRoutine } from "@/features/routine/api/routine";
import { RoutineEditor } from "@/features/routine/components/routine-editor";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Chỉnh sửa Routine",
  robots: { index: false, follow: false },
};

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let routine: RoutineDetailResponse;

  try {
    routine = await getRoutine(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }

  if (!routine.isActive) notFound();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeading
        eyebrow="Forge · Routines"
        title="Chỉnh sửa Routine"
        description="Đổi tên trình tự mà không làm thay đổi các Habit đang được kết nối."
      />
      <RoutineEditor initialRoutine={routine} />
    </section>
  );
}
