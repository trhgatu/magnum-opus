import type { Metadata } from "next";
import { ListChecks } from "lucide-react";

import { ContextHero } from "@/components/system/context-hero";
import { RoutineEditor } from "@/features/routine/components/routine-editor";

export const metadata: Metadata = {
  title: "Tạo Nếp sinh hoạt",
  robots: { index: false, follow: false },
};

export default function NewRoutinePage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <ContextHero
        icon={ListChecks}
        eyebrow="Forge · Nếp sinh hoạt"
        title="Tạo một Nếp sinh hoạt"
        description="Định danh nghi thức trước, sau đó kết nối những Thói quen sẽ đưa nó từ ý định thành hành động."
      />
      <RoutineEditor />
    </section>
  );
}
