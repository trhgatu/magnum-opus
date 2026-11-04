"use client";

import type { HabitDayMark, HabitOverviewItemResponse } from "@repo/contracts";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";

type CheckInHabit = Pick<
  HabitOverviewItemResponse,
  "id" | "checkedInToday" | "dueToday" | "currentStreak"
>;

/**
 * Ghi dấu hôm nay với trạng thái lạc quan, dùng chung cho dòng ở danh sách
 * và trang chi tiết: vòng, chuỗi và dấu của hôm nay đổi ngay khi bấm.
 */
export function useHabitCheckIn(
  habit: CheckInHabit,
  { onBeforeRefresh }: { onBeforeRefresh?: () => void } = {},
) {
  const router = useRouter();
  const [checked, setChecked] = useOptimistic(habit.checkedInToday);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  // Ghi dấu ngày không có lịch không cộng chuỗi (BR-HAB3-006).
  const streak =
    habit.currentStreak +
    (habit.dueToday ? Number(checked) - Number(habit.checkedInToday) : 0);
  const todayMark: HabitDayMark = checked
    ? "DONE"
    : habit.dueToday
      ? "PENDING"
      : "REST";

  /** Dải ngày (cuối là hôm nay) theo trạng thái đang hiển thị. */
  const withToday = <T extends { mark: HabitDayMark }>(
    days: readonly T[],
  ): T[] =>
    checked === habit.checkedInToday
      ? [...days]
      : days.map((day, index) =>
          index === days.length - 1 ? { ...day, mark: todayMark } : day,
        );

  // Mọi nhánh đều đọc lại từ server; dòng có thể chuyển nhóm sau đó.
  const reload = () => {
    onBeforeRefresh?.();
    router.refresh();
  };

  const toggle = () => {
    setMessage(undefined);
    startTransition(async () => {
      setChecked(!checked);
      try {
        const result = await changeHabitCheckIn({
          id: habit.id,
          action: checked ? "undo" : "check-in",
        });
        if (result.status === "error") {
          setMessage(result.message);
          // Có thể đã ghi được mà chỉ bước đọc lại lỗi: lấy lại từ server.
          reload();
          return;
        }
      } catch {
        setMessage("Không thể ghi dấu lúc này. Thử lại sau.");
        reload();
        return;
      }
      reload();
    });
  };

  return { checked, streak, withToday, message, isPending, toggle };
}
