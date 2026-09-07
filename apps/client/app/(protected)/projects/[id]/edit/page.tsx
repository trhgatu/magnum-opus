import type { ProjectResponse } from "@repo/contracts";
import { FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContextHero } from "@/components/system/context-hero";
import { getProject } from "@/features/project/api/project";
import { ProjectEditor } from "@/features/project/components/project-editor";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Chỉnh sửa Project",
  robots: { index: false, follow: false },
};

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let project: ProjectResponse;

  try {
    project = await getProject(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <ContextHero
        icon={FolderKanban}
        eyebrow="Crucible · Project"
        title="Chỉnh sửa Project"
        description="Cập nhật tên và mô tả — lifecycle state và Cycle hiện tại không bị ảnh hưởng."
      />
      <ProjectEditor initialProject={project} />
    </section>
  );
}
