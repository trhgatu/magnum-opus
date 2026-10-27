import type {
  CycleActivitySnapshotResponse,
  ProjectCycleResponse,
  ProjectResponse,
} from "@repo/contracts";
import type { User } from "@repo/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { getCurrentUser } from "@/features/account/api/current-user";
import {
  getClosedProjectCycles,
  getProject,
} from "@/features/project/api/project";
import { ProjectDetail } from "@/features/project/components/project-detail";
import { ProjectResumeInline } from "@/features/project/components/project-inline-fields";
import {
  getCycleSnapshots,
  getProjectActivity,
} from "@/features/project-activity/api/project-activity";
import {
  ActivitySourcesPanel,
  ActivitySourcesSkeleton,
} from "@/features/project-activity/components/activity-sources-panel";
import { ActivitySourcesSheet } from "@/features/project-activity/components/activity-sources-sheet";
import { CycleSnapshot } from "@/features/project-activity/components/cycle-snapshot";
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
  let snapshots: CycleActivitySnapshotResponse[] | null;
  let user: User;

  try {
    [project, closedCycles, snapshots, user] = await Promise.all([
      getProject(id),
      // Lịch sử chỉ đọc, không phải đường chính của trang: lỗi tạm thời ở
      // đây (5xx/timeout) chỉ làm mục "Các chu kỳ đã đóng" báo lỗi, không
      // kéo sập cả trang. Project không tồn tại thì getProject đã 404 song
      // song nên vẫn ra notFound() như cũ.
      getClosedProjectCycles(id).catch(() => null),
      // Phần phụ của lịch sử: lỗi thì các vòng chỉ thiếu mục hoạt động.
      getCycleSnapshots(id).catch(() => null),
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

  // Vòng không có snapshot: không có mục "Hoạt động của vòng" (06 §10).
  const closedCycleActivity: Record<string, ReactNode> = {};
  for (const snapshot of snapshots ?? []) {
    const cycle = closedCycles?.find((item) => item.id === snapshot.cycleId);
    if (cycle?.endedAt) {
      closedCycleActivity[snapshot.cycleId] = (
        <CycleSnapshot
          snapshot={snapshot}
          cycleNumber={cycle.cycleNumber}
          closedAt={cycle.endedAt}
        />
      );
    }
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
      closedCycleActivity={closedCycleActivity}
      sourcesAction={
        <ActivitySourcesSheet>
          <Suspense fallback={<ActivitySourcesSkeleton />}>
            <ActivitySourcesPanel projectId={project.id} />
          </Suspense>
        </ActivitySourcesSheet>
      }
      activityNotes={
        <Suspense fallback={null}>
          <ActivityDivergencePanel activity={activity} />
        </Suspense>
      }
    />
  );
}
