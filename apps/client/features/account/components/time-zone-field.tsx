"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateMyTimeZone } from "@/features/account/actions/account";
import { sameTimeZone } from "@/features/account/lib/time-zone";
import { notifySuccess } from "@/lib/toast";
import { TimeZonePicker } from "@/features/account/components/time-zone-picker";
import { useBrowserTimeZone } from "@/features/account/hooks/use-browser-time-zone";

interface TimeZoneFieldProps {
  timeZone: string;
}

export function TimeZoneField({ timeZone }: TimeZoneFieldProps) {
  const [saved, setSaved] = useState(timeZone);
  const [selected, setSelected] = useState(timeZone);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const browserTimeZone = useBrowserTimeZone();
  const offerBrowserZone =
    browserTimeZone !== null && !sameTimeZone(browserTimeZone, saved);

  const save = (next: string) => {
    setError(undefined);
    startTransition(async () => {
      const result = await updateMyTimeZone(next);

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setSaved(result.timeZone);
      setSelected(result.timeZone);
      void notifySuccess(`Đã đổi múi giờ sang ${result.timeZone}`);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <span id="time-zone-label" className="text-sm font-medium">
          Múi giờ
        </span>

        <p id="time-zone-hint" className="text-sm text-muted-foreground">
          Ngày “hôm nay”, check-in, tái phạm và Chronicle được tính theo múi giờ
          này.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <TimeZonePicker
          value={selected}
          onValueChange={setSelected}
          disabled={isPending}
          labelId="time-zone-label"
          describedById="time-zone-hint"
        />

        <Button
          type="button"
          disabled={isPending || selected === saved}
          onClick={() => save(selected)}
        >
          Lưu múi giờ
        </Button>
      </div>
      {offerBrowserZone ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={isPending}
          onClick={() => save(browserTimeZone)}
        >
          Dùng múi giờ của máy này ({browserTimeZone})
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
