"use client";

import type { RoutineHabitOptionResponse } from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";
import { Check, ChevronsUpDown, LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SEARCH_DELAY_MS = 250;
const OPTION_LIMIT = 20;

type LoadState = "loading" | "ready" | "error";

function isOptionResponse(
  value: unknown,
): value is PaginatedResult<RoutineHabitOptionResponse> {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.data)) return false;
  if (!candidate.meta || typeof candidate.meta !== "object") return false;

  const meta = candidate.meta as Record<string, unknown>;

  return (
    candidate.data.every(
      (option) =>
        !!option &&
        typeof option === "object" &&
        typeof (option as Record<string, unknown>).id === "string" &&
        typeof (option as Record<string, unknown>).title === "string",
    ) && typeof meta.totalItems === "number"
  );
}

export function RoutineHabitPicker({
  routineId,
  revision,
  value,
  onValueChange,
  disabled = false,
}: {
  routineId: string;
  revision: number;
  value: string;
  onValueChange: (habitId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<RoutineHabitOptionResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const selectedOption = options.find((option) => option.id === value);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    const timeoutId = window.setTimeout(
      async () => {
        const params = new URLSearchParams({
          page: "1",
          limit: String(OPTION_LIMIT),
        });
        const normalizedQuery = query.trim();

        if (normalizedQuery) params.set("search", normalizedQuery);
        setLoadState("loading");

        try {
          const response = await fetch(
            `/api/routines/${routineId}/available-habits?${params.toString()}`,
            {
              cache: "no-store",
              headers: { Accept: "application/json" },
              signal: controller.signal,
            },
          );

          if (!response.ok) throw new Error("Unable to load Habit options");

          const payload: unknown = await response.json();
          if (!isOptionResponse(payload)) {
            throw new Error("Invalid Habit options response");
          }

          setOptions(payload.data);
          setTotal(payload.meta.totalItems);
          setLoadState("ready");
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;

          setOptions([]);
          setTotal(0);
          setLoadState("error");
        }
      },
      query ? SEARCH_DELAY_MS : 0,
    );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, query, revision, routineId]);

  const chooseOption = (option: RoutineHabitOptionResponse) => {
    onValueChange(option.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Chọn Habit đang hoạt động"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between bg-background sm:flex-1"
        >
          <span className="truncate">
            {selectedOption?.title ?? "Chọn Habit đang hoạt động"}
          </span>
          <ChevronsUpDown className="opacity-55" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) gap-2 rounded-xl p-2 shadow-lg"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm Habit theo tên"
            aria-label="Tìm Habit theo tên"
            className="pl-8"
            autoComplete="off"
          />
        </div>

        <div
          role="listbox"
          aria-label="Habit có thể thêm"
          aria-busy={loadState === "loading"}
          className="max-h-64 overflow-y-auto"
        >
          {loadState === "loading" ? (
            <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Đang tìm Habit…
            </p>
          ) : null}

          {loadState === "error" ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">
              Không thể tải danh sách Habit. Thử đóng và mở lại.
            </p>
          ) : null}

          {loadState === "ready" && options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy Habit phù hợp.
            </p>
          ) : null}

          {loadState === "ready"
            ? options.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="ghost"
                  role="option"
                  aria-selected={option.id === value}
                  onClick={() => chooseOption(option)}
                  className="h-9 w-full justify-start"
                >
                  <Check
                    className={cn(
                      "mr-1",
                      option.id === value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{option.title}</span>
                </Button>
              ))
            : null}
        </div>

        {loadState === "ready" && total > options.length ? (
          <p className="border-t px-2 pt-2 text-xs text-muted-foreground">
            Hiển thị {options.length} trong {total} kết quả. Nhập tên để thu
            hẹp.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
