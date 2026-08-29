import type { RoutineDetailResponse } from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getRoutine } from "@/features/routine/api/routine";
import { RoutineDetail } from "@/features/routine/components/routine-detail";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Trình tự",
  robots: { index: false, follow: false },
};

export default async function RoutineDetailPage({
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

  return <RoutineDetail routine={routine} />;
}
