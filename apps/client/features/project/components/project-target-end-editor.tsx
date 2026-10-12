"use client";

import { vi } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { useState, useTransition } from "react";

import { LifecycleErrorAlert } from "@/components/system/lifecycle-error-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ProjectOutcomeSubmitResult } from "@/features/project/components/project-outcome-editor";
import {
  calendarDateToDateOnly,
  dateOnlyToCalendarDate,
  daysOverdue,
  formatDateOnly,
} from "@/features/project/lib/cycle-dates";
import { notifySuccess } from "@/lib/toast";

/** Ngày kết thúc dự kiến của Cycle đang mở (BR-PRJ-036). Chỉ là mốc tự đặt
 * để tự nhìn lại — quá ngày không đổi trạng thái gì, chỉ hiện nhãn nhắc.
 * Component thuần UI như `ProjectOutcomeEditor`: việc gọi API, revision và
 * hàng đợi `runExclusive` do `ProjectTargetEndEditorInline` lo qua
 * `onSubmit`. Chọn ngày là lưu luôn — không có bản nháp nào để giữ. */
export function ProjectTargetEndEditor({
  targetEndAt,
  today,
  onSubmit,
  onReload,
}: {
  targetEndAt: string | null;
  /** Hôm nay (YYYY-MM-DD) theo múi giờ của tài khoản. */
  today: string;
  onSubmit: (targetEndAt: string | null) => Promise<ProjectOutcomeSubmitResult>;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  const overdue = targetEndAt ? daysOverdue(targetEndAt, today) : 0;
  const selected = targetEndAt
    ? dateOnlyToCalendarDate(targetEndAt)
    : undefined;

  const submit = (next: string | null) => {
    setMessage(undefined);
    setHasConflict(false);

    startTransition(async () => {
      const result = await onSubmit(next);

      if (result.status === "stale") return;

      if (result.status === "error") {
        setMessage(result.message);
        setHasConflict(!!result.hasConflict);
        return;
      }

      void notifySuccess(next ? "Đã đặt ngày dự kiến" : "Đã bỏ ngày dự kiến");
    });
  };

  const reloadLatestRevision = () => {
    setMessage(undefined);
    setHasConflict(false);
    onReload();
  };

  return (
    <div className="flex flex-col gap-3">
      {message ? (
        <LifecycleErrorAlert
          message={message}
          hasConflict={hasConflict}
          onReload={reloadLatestRevision}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {targetEndAt ? (
            <>
              <span className="text-muted-foreground">Dự kiến kết thúc</span>
              <time dateTime={targetEndAt} className="font-medium">
                {formatDateOnly(targetEndAt)}
              </time>
              {overdue > 0 ? (
                <Badge variant="destructive">
                  Quá hạn dự kiến {overdue} ngày
                </Badge>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">
              Chưa đặt ngày kết thúc dự kiến.
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
              >
                <CalendarIcon aria-hidden="true" />
                {isPending
                  ? "Đang lưu…"
                  : targetEndAt
                    ? "Đổi ngày"
                    : "Đặt ngày"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selected}
                defaultMonth={selected ?? dateOnlyToCalendarDate(today)}
                locale={vi}
                onSelect={(date) => {
                  if (!date) return;
                  setOpen(false);

                  const next = calendarDateToDateOnly(date);
                  if (next !== targetEndAt) submit(next);
                }}
              />
            </PopoverContent>
          </Popover>

          {targetEndAt ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => submit(null)}
            >
              <X aria-hidden="true" />
              Bỏ ngày
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
