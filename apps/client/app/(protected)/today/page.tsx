import { CalendarCheck2, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getToday } from "@/features/today/api/today";
import { TodayBoard } from "@/features/today/components/today-board";
import {
  TodayBoardSkeleton,
  TodayMetaSkeleton,
} from "@/features/today/components/today-skeletons";

export const metadata: Metadata = {
  title: "Hôm nay",
  robots: { index: false, follow: false },
};

async function TodayMeta({
  todayPromise,
}: {
  todayPromise: ReturnType<typeof getToday>;
}) {
  const today = await todayPromise;
  return (
    <>
      <Badge variant="outline">
        <CalendarCheck2 aria-hidden="true" />
        <span className="font-mono">{today.date}</span>
      </Badge>
      <Badge variant="secondary">
        <Clock3 aria-hidden="true" />
        {today.timeZone}
      </Badge>
    </>
  );
}

async function TodayBody({
  todayPromise,
}: {
  todayPromise: ReturnType<typeof getToday>;
}) {
  const today = await todayPromise;

  if (today.emptyReason === "NO_ACTIVE_HABITS") {
    return (
      <EmptyState
        title="Chưa có Thói quen đang hoạt động"
        description="Tạo một Thói quen để bắt đầu đặt nhịp thực hành vào từng ngày."
        action={
          <Link href="/habits/new" className={buttonVariants()}>
            Tạo Thói quen
          </Link>
        }
      />
    );
  }

  if (today.emptyReason === "NOTHING_DUE") {
    return (
      <EmptyState
        title="Hôm nay không có thực hành đến lịch"
        description="Không cần thêm gì vào ngày này. Các Thói quen sẽ trở lại theo lịch đã đặt."
      />
    );
  }

  return <TodayBoard key={today.date} today={today} />;
}

export default async function TodayPage() {
  // Một promise dùng chung cho cả badge ngày/giờ lẫn board — apiFetch
  // không dedupe theo URL (x-correlation-id random mỗi lần), nên gọi lại
  // getToday() ở hai nơi sẽ tốn 2 round-trip thật thay vì được cache lại.
  const todayPromise = getToday();

  return (
    <section className="flex flex-col gap-7" aria-labelledby="today-heading">
      <ContextHero
        id="today-heading"
        icon={CalendarCheck2}
        eyebrow="Forge · Hôm nay"
        title="Hôm nay"
        description="Những Thói quen đến lịch được đặt theo Nếp sinh hoạt, cùng trạng thái ghi dấu của ngày hiện tại."
        meta={
          <Suspense fallback={<TodayMetaSkeleton />}>
            <TodayMeta todayPromise={todayPromise} />
          </Suspense>
        }
      />

      <Suspense fallback={<TodayBoardSkeleton />}>
        <TodayBody todayPromise={todayPromise} />
      </Suspense>
    </section>
  );
}
