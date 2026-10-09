import { redirect } from "next/navigation";

import {
  chronicleHref,
  monthOfDay,
} from "@/features/chronicle/lib/chronicle-month";
import { getToday } from "@/features/today/api/today";

// "Tháng hiện tại" phải theo múi giờ owner (KD-CHR-011), không theo giờ
// server — Today API trả đúng ngày lịch của owner.
export default async function ChronicleIndexPage() {
  const today = await getToday();

  redirect(chronicleHref(monthOfDay(today.date)));
}
