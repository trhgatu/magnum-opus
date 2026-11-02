"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import {
  readThemeChoice,
  saveThemeChoice,
  subscribeToThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
] as const;

/** Lựa chọn nằm ở trình duyệt nên server không biết; chỉ đọc sau khi hydrate. */
function useStoredChoice() {
  return useSyncExternalStore<ThemeChoice | undefined>(
    subscribeToThemeChoice,
    readThemeChoice,
    () => undefined,
  );
}

export function ThemeField() {
  const current = useStoredChoice();

  return (
    <fieldset aria-describedby="theme-hint" className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Giao diện</legend>
      <p id="theme-hint" className="-mt-2 text-sm text-muted-foreground">
        Lưu trên trình duyệt này. “Theo hệ thống” đổi theo chế độ sáng tối của
        máy.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              current === value
                ? "border-transparent bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={current === value}
              onChange={() => saveThemeChoice(value)}
              className="sr-only"
            />
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
