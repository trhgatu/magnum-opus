import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/system/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/features/account/api/current-user";
import { getProjects } from "@/features/project/api/project";
import { ProjectCollectionControls } from "@/features/project/components/project-collection-controls";
import { ProjectPagination } from "@/features/project/components/project-pagination";
import { ProjectRow } from "@/features/project/components/project-row";
import { ProjectRunning } from "@/features/project/components/project-running";
import { ProjectSearch } from "@/features/project/components/project-search";
import {
  ProjectListSkeleton,
  ProjectMetaSkeleton,
  ProjectRunningSkeleton,
} from "@/features/project/components/project-skeletons";
import { parseProjectLocation } from "@/features/project/lib/project-url";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

type Location = ReturnType<typeof parseProjectLocation>;
type ProjectsPromise = ReturnType<typeof getProjects>;

async function Summary({
  runningPromise,
}: {
  runningPromise: ProjectsPromise;
}) {
  const running = await runningPromise.catch(() => null);
  if (!running) return null;
  const count = running.meta.totalItems;
  return (
    <>
      {count === 0
        ? "Chưa có Project nào đang luyện."
        : `${count} Project đang luyện.`}
    </>
  );
}

async function Running({
  runningPromise,
  today,
  timeZone,
}: {
  runningPromise: ProjectsPromise;
  today: string;
  timeZone: string;
}) {
  // Phần này lỗi thì chỉ ẩn đi, danh sách bên dưới vẫn dùng được.
  const running = await runningPromise.catch(() => null);
  if (!running) return null;
  return (
    <ProjectRunning projects={running.data} today={today} timeZone={timeZone} />
  );
}

async function ProjectsList({
  projectsPromise,
  location,
}: {
  projectsPromise: ProjectsPromise;
  location: Location;
}) {
  const result = await projectsPromise;

  if (result.data.length === 0) {
    const filtered = location.search !== "" || location.state !== undefined;
    return (
      <EmptyState
        title={filtered ? "Không tìm thấy Project" : "Chưa có Project nào"}
        description={
          filtered
            ? "Thử từ khóa khác hoặc xóa bộ lọc hiện tại."
            : "Bắt đầu bằng một effort đủ ý nghĩa để theo đuổi."
        }
        action={
          filtered ? (
            <Link
              href="/projects"
              className={buttonVariants({ variant: "outline" })}
            >
              Xem tất cả Project
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p aria-live="polite" className="sr-only">
        {result.meta.totalItems} kết quả
      </p>
      <ul className="flex flex-col gap-2.5">
        {result.data.map((project) => (
          <ProjectRow key={project.id} project={project} />
        ))}
      </ul>
      <ProjectPagination
        location={location}
        totalPages={result.meta.totalPages}
      />
    </div>
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseProjectLocation(await searchParams);
  const projectsPromise = getProjects({ ...location, limit: 20 });
  const runningPromise = getProjects({ state: "ACTIVE", limit: 20 });
  // getCurrentUser() đã được layout gọi trong cùng request (React cache).
  const user = await getCurrentUser();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: user.timeZone,
  }).format(new Date());
  // Đang tìm hay lọc thì danh sách là trọng tâm, bỏ phần "đang luyện".
  const showRunning =
    location.page === 1 && location.search === "" && !location.state;

  return (
    <section
      className="flex flex-col gap-10"
      aria-labelledby="projects-heading"
    >
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex max-w-3xl flex-col gap-3.5">
          <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            Crucible
          </p>
          <h1
            id="projects-heading"
            className="font-display text-5xl leading-[1.02] font-normal tracking-[-0.025em] sm:text-[64px]"
          >
            Project
          </h1>
          <p className="text-base text-muted-foreground sm:text-[17px]">
            <Suspense fallback={<ProjectMetaSkeleton />}>
              <Summary runningPromise={runningPromise} />
            </Suspense>
          </p>
        </div>
        <Link href="/projects/new" className={buttonVariants({ size: "lg" })}>
          <Plus aria-hidden="true" /> Tạo Project
        </Link>
      </header>

      {showRunning ? (
        <Suspense fallback={<ProjectRunningSkeleton />}>
          <Running
            runningPromise={runningPromise}
            today={today}
            timeZone={user.timeZone}
          />
        </Suspense>
      ) : null}

      <section aria-labelledby="project-all" className="flex flex-col gap-4">
        <h2
          id="project-all"
          className="font-mono text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase"
        >
          Tất cả Project
        </h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <ProjectSearch location={location} />
          </div>
          <ProjectCollectionControls location={location} />
        </div>
        <Suspense fallback={<ProjectListSkeleton />}>
          <ProjectsList projectsPromise={projectsPromise} location={location} />
        </Suspense>
      </section>
    </section>
  );
}
