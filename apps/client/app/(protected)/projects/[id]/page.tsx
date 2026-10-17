import type { ProjectCycleResponse, ProjectResponse } from "@repo/contracts";
import type { User } from "@repo/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/account/api/current-user";
import {
  getClosedProjectCycles,
  getProject,
} from "@/features/project/api/project";
import { ProjectDetail } from "@/features/project/components/project-detail";
import { ProjectResumeInline } from "@/features/project/components/project-inline-fields";
import { getProjectActivity } from "@/features/project-activity/api/project-activity";
import {
  ActivityDivergencePanel,
  CycleActivityPanel,
  CycleActivitySkeleton,
} from "@/features/project-activity/components/project-activity-panel";
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
  // Bắt đầu ngay, không chờ: server có thể đồng bộ tới 10 giây. Lỗi chỉ làm
  // phần hoạt động báo lỗi, phần còn lại của trang vẫn hiện.
  const activity = getProjectActivity(id).catch(() => null);
  let project: ProjectResponse;
  let closedCycles: ProjectCycleResponse[] | null;
  let user: User;

  try {
    [project, closedCycles, user] = await Promise.all([
      getProject(id),
      // Lịch sử chỉ đọc, không phải đường chính của trang: lỗi tạm thời ở
      // đây (5xx/timeout) chỉ làm mục "Các chu kỳ đã đóng" báo lỗi, không
      // kéo sập cả trang. Project không tồn tại thì getProject đã 404 song
      // song nên vẫn ra notFound() như cũ.
      getClosedProjectCycles(id).catch(() => null),
      getCurrentUser(),
    ]);
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
    <ProjectDetail
      project={project}
      closedCycles={closedCycles}
      timeZone={user.timeZone}
      activity={
        <Suspense fallback={<CycleActivitySkeleton />}>
          <CycleActivityPanel
            activity={activity}
            resumeAction={<ProjectResumeInline />}
          />
        </Suspense>
      }
      activityNotes={
        <Suspense fallback={null}>
          <ActivityDivergencePanel activity={activity} />
        </Suspense>
      }
    />
  );
}
