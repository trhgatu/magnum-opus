import { CalendarCheck2, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getToday } from "@/features/today/api/today";
import { TodayBoard } from "@/features/today/components/today-board";

export const metadata: Metadata = {
  title: "Hôm nay",
  robots: { index: false, follow: false },
};

export default async function TodayPage() {
  const today = await getToday();

  return (
    <section className="flex flex-col gap-7" aria-labelledby="today-heading">
      <ContextHero
        id="today-heading"
        icon={CalendarCheck2}
        eyebrow="Forge · Hôm nay"
        title="Hôm nay"
        description="Những Thói quen đến lịch được đặt theo Trình tự, cùng trạng thái ghi dấu của ngày hiện tại."
        meta={
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
        }
      />

      {today.emptyReason === "NO_ACTIVE_HABITS" ? (
        <EmptyState
          title="Chưa có Thói quen đang hoạt động"
          description="Tạo một Thói quen để bắt đầu đặt nhịp thực hành vào từng ngày."
          action={
            <Link href="/habits/new" className={buttonVariants()}>
              Tạo Thói quen
            </Link>
          }
        />
      ) : today.emptyReason === "NOTHING_DUE" ? (
        <EmptyState
          title="Hôm nay không có thực hành đến lịch"
          description="Không cần thêm gì vào ngày này. Các Thói quen sẽ trở lại theo lịch đã đặt."
        />
      ) : (
        <TodayBoard key={today.date} today={today} />
      )}
    </section>
  );
}
