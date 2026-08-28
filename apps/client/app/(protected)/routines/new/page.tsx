import type { Metadata } from "next";

import { PageHeading } from "@/components/system/page-heading";
import { RoutineEditor } from "@/features/routine/components/routine-editor";

export const metadata: Metadata = {
  title: "Tạo Routine",
  robots: { index: false, follow: false },
};

export default function NewRoutinePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeading
        eyebrow="Forge · Routines"
        title="Tạo một trình tự"
        description="Đặt tên cho nhịp thực hành. Các Habit sẽ được kết nối ở bước kế tiếp."
      />
      <RoutineEditor />
    </section>
  );
}
