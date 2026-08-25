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
import { cn } from "@/lib/utils";

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
    <form onSubmit={submit} className="space-y-6" aria-busy={isPending}>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="habit-title">Tên thói quen</Label>
        <Input
          id="habit-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
          disabled={isPending}
          placeholder="Ví dụ: Thiền 10 phút"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="habit-description">Ý nghĩa</Label>
        <Textarea
          id="habit-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isPending}
          placeholder="Vì sao nhịp lặp này đáng được duy trì?"
        />
      </div>
      <div className="space-y-2">
        <Label>Lịch thực hiện</Label>
        <Select
          value={frequencyType}
          onValueChange={(value) => {
            setFrequencyType(value as HabitFrequencyType);
            if (value === "DAILY") setDays([]);
          }}
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DAILY">Mỗi ngày</SelectItem>
            <SelectItem value="WEEKLY">Theo ngày trong tuần</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {frequencyType === "WEEKLY" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Chọn ít nhất một ngày</legend>
          <div className="flex flex-wrap gap-2">
            {ISO_WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                aria-pressed={days.includes(day.value)}
                disabled={isPending}
                onClick={() => toggleDay(day.value)}
                className={cn(
                  "size-10 rounded-full border text-sm transition",
                  days.includes(day.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {day.shortLabel}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={initialHabit ? `/habits/${initialHabit.id}` : "/habits"}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Hủy
        </Link>
        <Button type="submit" size="lg" disabled={isPending}>
          <Save aria-hidden="true" />{" "}
          {isPending
            ? "Đang lưu…"
            : initialHabit
              ? "Lưu thay đổi"
              : "Tạo thói quen"}
        </Button>
      </div>
    </form>
  );
}
