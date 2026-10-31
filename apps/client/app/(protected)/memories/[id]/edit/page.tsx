import type { MemoryResponse } from "@repo/contracts";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { getMemory } from "@/features/memory/api/memory";
import { MemoryEditor } from "@/features/memory/components/memory-editor";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Chỉnh sửa ký ức",
  robots: {
    index: false,
    follow: false,
  },
};

interface EditMemoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditMemoryPage({ params }: EditMemoryPageProps) {
  const { id } = await params;

  let memory: MemoryResponse;

  try {
    memory = await getMemory(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    ) {
      notFound();
    }

    throw error;
  }

  if (memory.state === "TRASHED") {
    redirect(`/memories/${memory.id}`);
  }

  // Cùng khung với trang chi tiết (memory-detail.tsx): bấm Chỉnh sửa thì
  // nội dung không tụt xuống hay co lại.
  return (
    <article
      className="flex w-full flex-col gap-6"
      aria-labelledby="edit-memory-heading"
    >
      <nav
        aria-label="Điều hướng ký ức"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Link
          href={`/memories/${memory.id}`}
          className={buttonVariants({
            variant: "ghost",
          })}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Trở về ký ức này
        </Link>
      </nav>

      <div className="relative overflow-hidden rounded-3xl border bg-card/70 shadow-sm">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-primary/30"
        />
        <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-3 sm:px-10">
          <h1
            id="edit-memory-heading"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Chỉnh sửa ký ức
          </h1>
        </div>
        <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-14">
          <div className="max-w-3xl">
            <MemoryEditor
              key={`${memory.id}:${memory.revision}`}
              initialMemory={memory}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
