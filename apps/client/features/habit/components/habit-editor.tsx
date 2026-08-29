"use client";

import type { HabitFrequencyType, HabitResponse } from "@repo/contracts";
import { Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createHabit, updateHabit } from "@/features/habit/actions/habit";
import { ISO_WEEKDAYS } from "@/features/habit/lib/habit-frequency";

export function HabitEditor({
  initialHabit,
}: {
  initialHabit?: HabitResponse;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialHabit?.title ?? "");
  const [description, setDescription] = useState(
    initialHabit?.description ?? "",
  );
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>(
    initialHabit?.frequencyType ?? "DAILY",
  );
  const [days, setDays] = useState(initialHabit?.frequencyDays ?? []);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const toggleDay = (day: number) =>
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(undefined);
    startTransition(async () => {
      const input = { title, description, frequencyType, frequencyDays: days };
      const result = initialHabit
        ? await updateHabit({
            ...input,
            id: initialHabit.id,
            expectedRevision: initialHabit.revision,
          })
        : await createHabit(input);
      if (result.status === "error") {
        setMessage(
          result.code === "HABIT_REVISION_CONFLICT"
            ? "Thói quen đã thay đổi ở nơi khác. Tải lại trang trước khi lưu tiếp."
            : result.message,
        );
        return;
      }
      router.push(`/habits/${result.habit.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={isPending}>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <section className="overflow-hidden rounded-3xl bg-card/70 shadow-sm ring-1 ring-foreground/10">
        <header className="border-b px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <span
                className="font-mono text-xs font-semibold"
                aria-hidden="true"
              >
                01
              </span>
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">
                Định nghĩa thực hành
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Viết rõ hành động và lý do khiến nó đáng được quay lại.
              </p>
            </div>
          </div>
        </header>
        <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="habit-title">Tên thói quen</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {title.length}/200
              </span>
            </div>
            <Input
              id="habit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              disabled={isPending}
              placeholder="Ví dụ: Thiền 10 phút"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="habit-description">Ý nghĩa</Label>
            <Textarea
              id="habit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
              placeholder="Vì sao thói quen này đáng được duy trì?"
              className="min-h-28 resize-y"
            />
          </div>
        </div>

        <div className="border-y bg-muted/20 px-5 py-5 sm:px-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <span
                className="font-mono text-xs font-semibold"
                aria-hidden="true"
              >
                02
              </span>
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                Nhịp thực hiện
              </p>
              <p className="text-sm text-muted-foreground">
                Chọn lịch có thể duy trì trong đời sống thực.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Lịch thực hiện</Label>
            <Select
              value={frequencyType}
              onValueChange={(value) => {
                setFrequencyType(value as HabitFrequencyType);
                if (value === "DAILY") setDays([]);
              }}
              disabled={isPending}
            >
              <SelectTrigger className="data-[size=default]:h-10 w-full bg-background sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Mỗi ngày</SelectItem>
                <SelectItem value="WEEKLY">Theo ngày trong tuần</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequencyType === "WEEKLY" ? (
            <fieldset className="mt-5 space-y-3">
              <legend className="text-sm font-medium">
                Chọn ít nhất một ngày
              </legend>
              <div className="flex flex-wrap gap-2">
                {ISO_WEEKDAYS.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    size="icon-lg"
                    variant={days.includes(day.value) ? "default" : "outline"}
                    aria-pressed={days.includes(day.value)}
                    disabled={isPending}
                    onClick={() => toggleDay(day.value)}
                    className="rounded-full"
                  >
                    {day.shortLabel}
                  </Button>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-3 bg-muted/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Link
            href={initialHabit ? `/habits/${initialHabit.id}` : "/habits"}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Hủy
          </Link>
          <Button type="submit" size="lg" disabled={isPending}>
            <Save aria-hidden="true" />
            {isPending
              ? "Đang lưu…"
              : initialHabit
                ? "Lưu thay đổi"
                : "Tạo thói quen"}
          </Button>
        </footer>
      </section>
    </form>
  );
}
