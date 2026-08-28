import type { MemoryResponse } from "@repo/contracts";
import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ContextHero } from "@/components/system/context-hero";
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

  return (
    <section
      className="flex flex-col gap-8"
      aria-labelledby="edit-memory-heading"
    >
      <ContextHero
        id="edit-memory-heading"
        icon={Pencil}
        eyebrow="Reflection · Archive"
        title="Chỉnh sửa ký ức"
        description="Điều chỉnh cách khoảnh khắc được ghi lại mà không làm mất nguồn gốc và lịch sử revision."
      />

      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border bg-card/70 shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:px-8">
          <span>Archive record</span>
          <span>Revision {memory.revision}</span>
        </div>
        <div className="p-5 sm:p-8">
          <MemoryEditor
            key={`${memory.id}:${memory.revision}`}
            initialMemory={memory}
          />
        </div>
      </div>
    </section>
  );
}
