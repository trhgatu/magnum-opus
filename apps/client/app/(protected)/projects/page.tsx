import { FolderKanban, Plus, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getProjects } from "@/features/project/api/project";
import { ProjectCard } from "@/features/project/components/project-card";
import { ProjectCollectionControls } from "@/features/project/components/project-collection-controls";
import { ProjectPagination } from "@/features/project/components/project-pagination";
import { ProjectSearch } from "@/features/project/components/project-search";
import {
  ProjectListSkeleton,
  ProjectMetaSkeleton,
} from "@/features/project/components/project-skeletons";
import { parseProjectLocation } from "@/features/project/lib/project-url";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

async function ProjectsMeta({
  projectsPromise,
}: {
  projectsPromise: ReturnType<typeof getProjects>;
}) {
  const result = await projectsPromise;
  return <Badge variant="outline">{result.meta.totalItems} Project</Badge>;
}

async function ProjectsList({
  projectsPromise,
  location,
}: {
  projectsPromise: ReturnType<typeof getProjects>;
  location: ReturnType<typeof parseProjectLocation>;
}) {
  const result = await projectsPromise;

  return (
    <>
      {result.data.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Những Project đã ghi nhận
              <span className="sr-only">
                {" "}
                — {result.meta.totalItems} kết quả
              </span>
            </p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            location.search ? "Không tìm thấy Project" : "Chưa có Project nào"
          }
          description={
            location.search
              ? "Thử từ khóa khác hoặc xóa bộ lọc hiện tại."
              : "Bắt đầu bằng cách ghi nhận effort đầu tiên bạn muốn theo đuổi."
          }
          action={
            location.search || location.state ? (
              <Link
                href="/projects"
                className={buttonVariants({ variant: "outline" })}
              >
                Xem tất cả Project
              </Link>
            ) : undefined
          }
        />
      )}
      <ProjectPagination
        location={location}
        totalPages={result.meta.totalPages}
      />
    </>
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseProjectLocation(await searchParams);
  const projectsPromise = getProjects({ ...location, limit: 20 });

  return (
    <section className="flex flex-col gap-7" aria-labelledby="projects-heading">
      <ContextHero
        id="projects-heading"
        icon={FolderKanban}
        eyebrow="Crucible · Project"
        title="Project"
        description="Ghi nhận những effort đủ ý nghĩa để theo đuổi, quan sát vòng đời và giữ lại lịch sử của từng chu kỳ theo đuổi."
        meta={
          <Suspense fallback={<ProjectMetaSkeleton />}>
            <ProjectsMeta projectsPromise={projectsPromise} />
          </Suspense>
        }
        actions={
          <Link href="/projects/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" /> Tạo Project
          </Link>
        }
      />
      <section
        aria-label="Tìm kiếm và lọc Project"
        className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Bàn điều phối
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <ProjectSearch location={location} />
          <ProjectCollectionControls location={location} />
        </div>
      </section>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectsList projectsPromise={projectsPromise} location={location} />
      </Suspense>
    </section>
  );
}
