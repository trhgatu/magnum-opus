import type { RoutineDetailResponse } from "@repo/contracts";
import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContextHero } from "@/components/system/context-hero";
import { getRoutine } from "@/features/routine/api/routine";
import { RoutineEditor } from "@/features/routine/components/routine-editor";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Chỉnh sửa Trình tự",
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
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <ContextHero
        icon={ListChecks}
        eyebrow="Forge · Trình tự"
        title="Chỉnh sửa Trình tự"
        description="Tinh chỉnh định danh của trình tự; những Thói quen đã kết nối và thứ tự thực hiện vẫn được giữ nguyên."
      />
      <RoutineEditor initialRoutine={routine} />
    </section>
  );
}
