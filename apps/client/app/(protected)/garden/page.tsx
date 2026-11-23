import type { Metadata } from "next";
import Link from "next/link";
import { Sprout } from "lucide-react";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { getGarden } from "@/features/garden/api/garden";
import { GardenView } from "@/features/garden/components/garden-view";

export const metadata: Metadata = {
  title: "Khu vườn",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function GardenPage() {
  const garden = await getGarden();

  return (
    <section className="flex flex-col gap-7" aria-labelledby="garden-heading">
      <ContextHero
        id="garden-heading"
        icon={Sprout}
        eyebrow="Garden"
        title="Khu vườn"
        description="Mỗi thói quen là một cây, mọc lên từ những tuần đã chăm. Nghỉ thì đứng yên, quay lại thì mọc tiếp."
      />

      {garden.trees.length > 0 ? (
        <GardenView trees={garden.trees} light={garden.light} />
      ) : (
        <EmptyState
          title="Vườn còn trống"
          description="Mỗi thói quen tạo ở Forge sẽ được gieo thành một cây ở đây."
          action={
            <Link
              href="/habits/new"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Tạo thói quen
            </Link>
          }
        />
      )}
    </section>
  );
}
