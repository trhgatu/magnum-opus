"use client";

import type { ForgeTodayResponse } from "@repo/contracts";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import {
  createTodayCheckInState,
  TodayCheckInState,
  updateTodayCheckInState,
} from "@/features/today/lib/today-check-in-state";

export function useTodayCheckIns(initialToday: ForgeTodayResponse) {
  const router = useRouter();

  const [checkedInByHabitId, setCheckedInByHabitId] =
    useState<TodayCheckInState>(() => createTodayCheckInState(initialToday));

  const [pendingHabitIds, setPendingHabitIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const [errorsByHabitId, setErrorsByHabitId] = useState<
    Record<string, string>
  >({});

  const inFlightHabitIds = useRef(new Set<string>());

  const toggleHabit = useCallback(
    async (habitId: string): Promise<void> => {
      if (inFlightHabitIds.current.has(habitId)) {
        return;
      }

      const checkedIn = checkedInByHabitId[habitId];

      if (checkedIn === undefined) {
        return;
      }

      inFlightHabitIds.current.add(habitId);

      setPendingHabitIds(new Set(inFlightHabitIds.current));

      setErrorsByHabitId((current) => {
        if (!(habitId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[habitId];

        return next;
      });

      try {
        const result = await changeHabitCheckIn({
          id: habitId,
          action: checkedIn ? "undo" : "check-in",
        });

        if (result.status === "error") {
          setErrorsByHabitId((current) => ({
            ...current,
            [habitId]: result.message,
          }));

          return;
        }
        setCheckedInByHabitId((current) =>
          updateTodayCheckInState(current, habitId, result.today.checkedIn),
        );
        router.refresh();
      } catch {
        setErrorsByHabitId((current) => ({
          ...current,
          [habitId]: "Không thể cập nhật thói quen lúc này.",
        }));
      } finally {
        inFlightHabitIds.current.delete(habitId);

        setPendingHabitIds(new Set(inFlightHabitIds.current));
      }
    },
    [checkedInByHabitId, router],
  );
  return {
    checkedInByHabitId,
    pendingHabitIds,
    errorsByHabitId,
    toggleHabit,
  };
}
