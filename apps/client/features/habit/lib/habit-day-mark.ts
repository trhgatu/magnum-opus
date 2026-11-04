import type { HabitDayMark } from "@repo/contracts";

/**
 * Cách vẽ một ngày trong dải 7 ngày và lưới 13 tuần (BA habit v3 §4): làm
 * xong tô than hồng, bỏ lỡ chỉ có viền, hôm nay chưa làm viền đậm. Ngày nghỉ
 * là một chấm, vẽ riêng bên trong ô.
 */
export const HABIT_DAY_MARK_CLASSES: Record<HabitDayMark, string> = {
  DONE: "bg-trace-done",
  MISSED: "border-[1.5px] border-trace-missed",
  REST: "",
  PENDING: "border-[1.5px] border-primary bg-ember-soft",
  UNTRACKED: "",
};
