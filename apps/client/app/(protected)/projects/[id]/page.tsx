import type { ProjectResponse } from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProject } from "@/features/project/api/project";
import { ProjectDetail } from "@/features/project/components/project-detail";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Project",
  robots: { index: false, follow: false },
};

export default async function ProjectDetailPage({
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

  return <ProjectDetail project={project} />;
}
