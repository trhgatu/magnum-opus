import type { ChronicleResponse } from "@repo/contracts";
import {
  BookOpenText,
  FolderKanban,
  Gem,
  ListChecks,
  Repeat2,
  Smile,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoodDistributionBar } from "@/features/chronicle/components/mood-distribution-bar";
import {
  RateBar,
  formatPercent,
} from "@/features/chronicle/components/rate-bar";
import { moodOption } from "@/features/mood/config/mood-labels";

function ChronicleGroup({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `chronicle-${eyebrow.toLowerCase()}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {eyebrow}
        </p>
        <h2 id={headingId} className="text-sm text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ChronicleCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function BigNumber({ value, unit }: { value: string; unit?: string }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="font-display text-4xl font-semibold tabular-nums tracking-tight">
        {value}
      </span>
      {unit ? (
        <span className="text-sm text-muted-foreground">{unit}</span>
      ) : null}
    </p>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t pt-3 text-sm first:border-t-0 first:pt-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function ChronicleOverview({
  chronicle,
}: {
  chronicle: ChronicleResponse;
}) {
  const { habit, routine, project, journal, mood, memory } = chronicle;
  const dominantMood = mood.dominantMood ? moodOption(mood.dominantMood) : null;

  return (
    <div className="flex flex-col gap-8">
      <ChronicleGroup eyebrow="Forge" title="Duy trì">
        <ChronicleCard icon={Repeat2} title="Thói quen">
          <BigNumber
            value={formatPercent(habit.buildCompletionRate)}
            unit="hoàn thành"
          />
          <RateBar
            value={habit.buildCompletionRate}
            label="Tỷ lệ hoàn thành thói quen"
          />
          <dl className="flex flex-col gap-3">
            <DetailRow label="Chuỗi dài nhất">
              {habit.bestStreak
                ? `${habit.bestStreak.habitTitle} · ${habit.bestStreak.days} ngày`
                : "Chưa có"}
            </DetailRow>
            <DetailRow label="Đều đặn nhất">
              {habit.mostConsistentHabit
                ? `${habit.mostConsistentHabit.habitTitle} · ${formatPercent(habit.mostConsistentHabit.completionRate)}`
                : "Chưa có"}
            </DetailRow>
            {habit.quitHabits.map((quitHabit) => (
              <DetailRow key={quitHabit.habitTitle} label="Đang bỏ">
                {`${quitHabit.habitTitle} · ${quitHabit.daysSinceLastRelapse} ngày không tái phạm`}
              </DetailRow>
            ))}
          </dl>
        </ChronicleCard>

        <ChronicleCard icon={ListChecks} title="Nếp sinh hoạt">
          <BigNumber
            value={formatPercent(routine.completionRate)}
            unit="buổi hoàn thành"
          />
          <RateBar
            value={routine.completionRate}
            label="Tỷ lệ buổi Nếp sinh hoạt hoàn thành"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            Một buổi được tính hoàn thành khi mọi Thói quen đến hạn trong ngày
            đều được ghi dấu.
          </p>
        </ChronicleCard>
      </ChronicleGroup>

      <ChronicleGroup eyebrow="Crucible" title="Theo đuổi">
        <ChronicleCard
          icon={FolderKanban}
          title="Project"
          className="md:col-span-2"
        >
          <dl className="grid grid-cols-3 gap-4">
            {[
              { label: "Đang chạy", value: project.activeCount },
              { label: "Hoàn thành", value: project.completedCount },
              { label: "Dừng", value: project.stoppedCount },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="font-display text-3xl font-semibold tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </ChronicleCard>
      </ChronicleGroup>

      <ChronicleGroup eyebrow="Phản chiếu" title="Ghi lại">
        <ChronicleCard icon={BookOpenText} title="Nhật ký">
          <BigNumber value={String(journal.entryCount)} unit="bài đã viết" />
        </ChronicleCard>

        <ChronicleCard icon={Gem} title="Ký ức">
          <BigNumber value={String(memory.memoryCount)} unit="ký ức đã lưu" />
        </ChronicleCard>

        <ChronicleCard icon={Smile} title="Tâm trạng" className="md:col-span-2">
          {dominantMood ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Nhiều nhất: </span>
              <span className="font-medium">
                {dominantMood.symbol} {dominantMood.label}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa ghi tâm trạng nào trong tháng này.
            </p>
          )}
          <MoodDistributionBar distribution={mood.distribution} />
        </ChronicleCard>
      </ChronicleGroup>
    </div>
  );
}
