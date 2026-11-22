"use client";

import type { GardenTreeResponse } from "@repo/contracts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { gardenStory } from "@/features/garden/lib/garden-story";
import { cn } from "@/lib/utils";

// three.js chỉ chạy ở trình duyệt và nặng: tải riêng, không prerender.
const GardenScene = dynamic(() => import("./garden-scene"), {
  ssr: false,
  loading: () => (
    <Skeleton className="h-[clamp(360px,62vw,620px)] w-full rounded-none" />
  ),
});

interface GardenViewProps {
  trees: readonly GardenTreeResponse[];
}

export function GardenView({ trees }: GardenViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = trees.find((tree) => tree.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden border-y">
        <GardenScene
          trees={trees}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      <div aria-live="polite" className="min-h-16 max-w-[70ch]">
        {selected ? (
          <div className="flex flex-col gap-2">
            <p className="font-display text-lg leading-7">
              {gardenStory(selected)}
            </p>
            <Link
              href={`/habits/${selected.subjectId}`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Mở thói quen
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Kéo để đi vòng quanh vườn, cuộn để lại gần, chạm vào một cây để nghe
            nó kể.
          </p>
        )}
      </div>

      {/* Danh sách cây: cách chọn cây bằng bàn phím và trình đọc màn hình. */}
      <section
        aria-labelledby="garden-trees-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="garden-trees-heading"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Các cây trong vườn
        </h2>
        <ul className="flex flex-wrap gap-2">
          {trees.map((tree) => (
            <li key={tree.id}>
              <button
                type="button"
                aria-pressed={tree.id === selectedId}
                onClick={() => setSelectedId(tree.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  tree.id === selectedId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {tree.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
