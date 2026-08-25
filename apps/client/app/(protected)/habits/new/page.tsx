import type { Metadata } from "next";

import { PageHeading } from "@/components/system/page-heading";
import { HabitEditor } from "@/features/habit/components/habit-editor";

export const metadata: Metadata = {
  title: "Tạo thói quen",
  robots: { index: false, follow: false },
};

export default function NewHabitPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeading
        eyebrow="Forge · Habits"
        title="Tạo một nhịp lặp"
        description="Định nghĩa hành động và nhịp tuần. Routine sẽ được kết nối ở một lát cắt riêng sau này."
      />
      <HabitEditor />
    </section>
  );
}
