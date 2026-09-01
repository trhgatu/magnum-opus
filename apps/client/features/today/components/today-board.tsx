"use client";

import type {
  ForgeTodayHabitResponse,
  ForgeTodayResponse,
} from "@repo/contracts";
import {
  AlertCircle,
  Check,
  Circle,
  ListChecks,
  LoaderCircle,
  Repeat2,
  Undo2,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTodayCheckIns } from "@/features/today/hooks/use-today-check-ins";
import { cn } from "@/lib/utils";

interface TodayHabitRowProps {
  habit: ForgeTodayHabitResponse;
  checkedIn: boolean;
  pending: boolean;
  error?: string;
  onToggle: (habitId: string) => Promise<void>;
}

function TodayHabitRow({
  habit,
  checkedIn,
  pending,
  error,
  onToggle,
}: TodayHabitRowProps) {
  return (
    <li className="border-t first:border-t-0">
      <div
        className={cn(
          "flex flex-col gap-4 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:px-5",
          checkedIn && "bg-primary/[0.035]",
        )}
        aria-busy={pending}
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full border text-muted-foreground",
            checkedIn && "border-primary/30 bg-primary/10 text-primary",
          )}
          aria-hidden="true"
        >
          {checkedIn ? (
            <Check className="size-4" />
          ) : (
            <Circle className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-medium leading-6">{habit.title}</p>
          {habit.description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {habit.description}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant={checkedIn ? "outline" : "default"}
          className="w-full sm:w-auto"
          disabled={pending}
          aria-pressed={checkedIn}
          aria-label={
            checkedIn ? `Hoàn tác ${habit.title}` : `Ghi dấu ${habit.title}`
          }
          onClick={() => void onToggle(habit.id)}
        >
          {pending ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" />
          ) : checkedIn ? (
            <Undo2 />
          ) : (
            <Check />
          )}
          {pending ? "Đang cập nhật…" : checkedIn ? "Hoàn tác" : "Ghi dấu"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="mx-4 mb-4 w-auto sm:mx-5">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}

export function TodayBoard({ today }: { today: ForgeTodayResponse }) {
  const { checkedInByHabitId, pendingHabitIds, errorsByHabitId, toggleHabit } =
    useTodayCheckIns(today);

  const renderHabit = (habit: ForgeTodayHabitResponse) => (
    <TodayHabitRow
      key={habit.id}
      habit={habit}
      checkedIn={checkedInByHabitId[habit.id] ?? habit.checkedIn}
      pending={pendingHabitIds.has(habit.id)}
      error={errorsByHabitId[habit.id]}
      onToggle={toggleHabit}
    />
  );

  return (
    <div className="space-y-7">
      {today.routines.map((routine, index) => (
        <section
          key={routine.id}
          aria-labelledby={`today-routine-${routine.id}`}
          className="overflow-hidden rounded-2xl border bg-card/70 shadow-sm"
        >
          <header className="flex items-center gap-3 border-b bg-muted/35 px-4 py-4 sm:px-5">
            <span className="grid size-9 place-items-center rounded-xl border bg-background text-primary">
              <ListChecks className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Trình tự {String(index + 1).padStart(2, "0")}
              </p>
              <h2
                id={`today-routine-${routine.id}`}
                className="font-display text-xl font-semibold tracking-tight"
              >
                {routine.title}
              </h2>
            </div>
          </header>
          <ol>{routine.habits.map(renderHabit)}</ol>
        </section>
      ))}

      {today.standaloneHabits.length ? (
        <section
          aria-labelledby="today-standalone-heading"
          className="overflow-hidden rounded-2xl border bg-card/70 shadow-sm"
        >
          <header className="flex items-center gap-3 border-b bg-muted/35 px-4 py-4 sm:px-5">
            <span className="grid size-9 place-items-center rounded-xl border bg-background text-primary">
              <Repeat2 className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Ngoài Trình tự
              </p>
              <h2
                id="today-standalone-heading"
                className="font-display text-xl font-semibold tracking-tight"
              >
                Thực hành riêng
              </h2>
            </div>
          </header>
          <ul>{today.standaloneHabits.map(renderHabit)}</ul>
        </section>
      ) : null}
    </div>
  );
}
