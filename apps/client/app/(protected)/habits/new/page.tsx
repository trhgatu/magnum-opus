import { Repeat2 } from "lucide-react";
import type { Metadata } from "next";

import { ContextHero } from "@/components/system/context-hero";
import { HabitEditor } from "@/features/habit/components/habit-editor";

export const metadata: Metadata = {
  title: "Tạo thói quen",
  robots: { index: false, follow: false },
};

export default function NewHabitPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <ContextHero
        icon={Repeat2}
        eyebrow="Forge · Thói quen"
        title="Tạo một thói quen"
        description="Định nghĩa một hành động đủ rõ để thực hiện và một nhịp đủ thực tế để quay lại vào ngày tiếp theo."
      />
      <HabitEditor />
    </section>
  );
}
