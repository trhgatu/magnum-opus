import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";

import { ContextHero } from "@/components/system/context-hero";
import { ProjectEditor } from "@/features/project/components/project-editor";

export const metadata: Metadata = {
  title: "Tạo Project",
  robots: { index: false, follow: false },
};

export default function NewProjectPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <ContextHero
        icon={FolderKanban}
        eyebrow="Crucible · Project"
        title="Tạo một Project"
        description="Ghi nhận effort trước khi bắt đầu — Project chỉ là identity, execution và Cycle đầu tiên bắt đầu khi bạn Start."
      />
      <ProjectEditor />
    </section>
  );
}
