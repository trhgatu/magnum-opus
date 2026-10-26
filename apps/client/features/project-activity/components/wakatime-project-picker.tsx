"use client";

import type { WakaTimeProjectResponse } from "@repo/contracts";
import { ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchWakaTimeProjects } from "@/features/project-activity/actions/project-activity";
import { linkErrorMessage } from "@/features/project-activity/lib/source-status";
import { formatInstantDay } from "@/features/project/lib/cycle-dates";

/** Đợi người dùng ngừng gõ rồi mới hỏi server. */
const SEARCH_DELAY_MS = 250;

interface WakaTimeProjectPickerProps {
  /** Project WakaTime đã là nguồn của Project này: không hiện lại. */
  excludedIds: ReadonlySet<string>;
  onSelect: (project: WakaTimeProjectResponse) => void;
  timeZone: string;
  disabled?: boolean;
}

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; projects: WakaTimeProjectResponse[] };

/** Ô chọn project WakaTime có tìm theo tên (08 §7.2). */
export function WakaTimeProjectPicker({
  excludedIds,
  onSelect,
  timeZone,
  disabled = false,
}: WakaTimeProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Kết quả gắn với từ khóa đã tìm: khác từ khóa đang gõ nghĩa là đang tải.
  const [found, setFound] = useState<{
    query: string;
    list: Exclude<ListState, { kind: "loading" }>;
  } | null>(null);
  const [pending, setPending] = useState<WakaTimeProjectResponse | null>(null);
  const list: ListState =
    found && found.query === query ? found.list : { kind: "loading" };

  useEffect(() => {
    if (!open) return;
    // Gõ tiếp hoặc đóng ô chọn: bỏ kết quả của lần tìm cũ.
    let current = true;
    const timer = setTimeout(
      async () => {
        const result = await searchWakaTimeProjects(query);
        if (!current) return;
        setFound({
          query,
          list:
            result.status === "error"
              ? { kind: "error", message: linkErrorMessage(result) }
              : { kind: "ready", projects: result.projects },
        });
      },
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setPending(null);
      setFound(null);
    }
  };

  const choose = (project: WakaTimeProjectResponse) => {
    // Đang dùng cho Project khác: nói rõ hệ quả trước khi gắn.
    if (project.usedByProjects.length > 0 && pending === null) {
      setPending(project);
      return;
    }
    onSelect(project);
    handleOpenChange(false);
  };

  const visible =
    list.kind === "ready"
      ? list.projects.filter((project) => !excludedIds.has(project.id))
      : [];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Gắn project WakaTime"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between sm:w-auto"
        >
          Gắn project WakaTime
          <ChevronsUpDown className="opacity-55" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[min(28rem,calc(100vw-2rem))] gap-2 rounded-xl p-2 shadow-lg"
      >
        {pending ? (
          <div className="flex flex-col gap-3 p-2 text-sm">
            <p>
              <strong>{pending.name}</strong> đang dùng cho{" "}
              {pending.usedByProjects
                .map((project) => project.title)
                .join(", ")}
              . Thời gian code của project này sẽ xuất hiện ở mọi Project dùng
              nó.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => choose(pending)}>
                Gắn {pending.name}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPending(null)}
              >
                Chọn project khác
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên project"
                aria-label="Tìm project WakaTime"
                className="pl-8"
                autoComplete="off"
              />
            </div>

            {list.kind === "loading" ? (
              <p
                role="status"
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                Đang tải project…
              </p>
            ) : list.kind === "error" ? (
              <p role="alert" className="px-3 py-6 text-center text-sm">
                {list.message}
              </p>
            ) : visible.length === 0 ? (
              <p
                role="status"
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                Không có project phù hợp.
              </p>
            ) : (
              <div
                role="listbox"
                aria-label="Project WakaTime"
                className="max-h-72 overflow-y-auto"
              >
                {visible.map((project) => (
                  <Button
                    key={project.id}
                    type="button"
                    variant="ghost"
                    role="option"
                    aria-selected={false}
                    onClick={() => choose(project)}
                    className="h-auto w-full flex-col items-start gap-0.5 py-2"
                  >
                    <span className="w-full truncate text-left">
                      {project.name}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {project.lastHeartbeatAt
                        ? `Code gần nhất ${formatInstantDay(project.lastHeartbeatAt, timeZone)}`
                        : "Chưa có thời gian code"}
                      {project.usedByProjects.length > 0
                        ? ` · Đang dùng cho: ${project.usedByProjects
                            .map((used) => used.title)
                            .join(", ")}`
                        : ""}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
