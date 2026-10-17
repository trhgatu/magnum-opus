"use client";

import type { GitHubRepositoryResponse } from "@repo/contracts";
import { ChevronsUpDown, Lock, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchGitHubRepositories } from "@/features/project-activity/actions/project-activity";
import { linkErrorMessage } from "@/features/project-activity/lib/source-status";

/** Đợi người dùng ngừng gõ rồi mới hỏi server. */
const SEARCH_DELAY_MS = 250;

interface RepositoryPickerProps {
  /** Repository đã là nguồn của Project này: không hiện lại (06 §7.3). */
  excludedIds: ReadonlySet<string>;
  onSelect: (repository: GitHubRepositoryResponse) => void;
  disabled?: boolean;
}

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      repositories: GitHubRepositoryResponse[];
      truncated: boolean;
    };

/** Ô chọn repository có tìm kiếm — tìm phía server trên toàn bộ repository. */
export function RepositoryPicker({
  excludedIds,
  onSelect,
  disabled = false,
}: RepositoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Kết quả gắn với từ khóa đã tìm: khác từ khóa đang gõ nghĩa là đang tải.
  const [found, setFound] = useState<{
    query: string;
    list: Exclude<ListState, { kind: "loading" }>;
  } | null>(null);
  const [pending, setPending] = useState<GitHubRepositoryResponse | null>(null);
  const list: ListState =
    found && found.query === query ? found.list : { kind: "loading" };

  useEffect(() => {
    if (!open) return;
    // Gõ tiếp hoặc đóng ô chọn: bỏ kết quả của lần tìm cũ.
    let current = true;
    const timer = setTimeout(
      async () => {
        const result = await searchGitHubRepositories(query);
        if (!current) return;
        setFound({
          query,
          list:
            result.status === "error"
              ? { kind: "error", message: linkErrorMessage(result) }
              : {
                  kind: "ready",
                  repositories: result.repositories,
                  truncated: result.truncated,
                },
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

  const choose = (repository: GitHubRepositoryResponse) => {
    // Đang dùng cho Project khác: nói rõ hệ quả trước khi gắn (06 §7.3).
    if (repository.usedByProjects.length > 0 && pending === null) {
      setPending(repository);
      return;
    }
    onSelect(repository);
    handleOpenChange(false);
  };

  const visible =
    list.kind === "ready"
      ? list.repositories.filter(
          (repository) => !excludedIds.has(repository.externalResourceId),
        )
      : [];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          // combobox không lấy tên từ nội dung: đặt tên rõ cho trình đọc màn hình.
          aria-label="Gắn repository"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between sm:w-auto"
        >
          Gắn repository
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
              <strong>{pending.fullName}</strong> đang dùng cho{" "}
              {pending.usedByProjects
                .map((project) => project.title)
                .join(", ")}
              . Hoạt động của repository này sẽ xuất hiện ở mọi Project dùng nó.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => choose(pending)}>
                Gắn {pending.fullName}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPending(null)}
              >
                Chọn repository khác
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
                placeholder="Tìm theo tên repository"
                aria-label="Tìm repository"
                className="pl-8"
                autoComplete="off"
              />
            </div>

            {/* Dòng trạng thái nằm ngoài listbox: listbox chỉ chứa option. */}
            {list.kind === "loading" ? (
              <p
                role="status"
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                Đang tải repository…
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
                Không có repository phù hợp.
              </p>
            ) : (
              <div
                role="listbox"
                aria-label="Repository"
                className="max-h-72 overflow-y-auto"
              >
                {visible.map((repository) => (
                  <Button
                    key={repository.externalResourceId}
                    type="button"
                    variant="ghost"
                    role="option"
                    aria-selected={false}
                    onClick={() => choose(repository)}
                    className="h-auto w-full flex-col items-start gap-0.5 py-2"
                  >
                    <span className="flex w-full items-center gap-1.5">
                      <span className="truncate">{repository.fullName}</span>
                      {repository.isPrivate ? (
                        <Lock
                          className="size-3 shrink-0 opacity-60"
                          role="img"
                          aria-label="riêng tư"
                        />
                      ) : null}
                    </span>
                    {repository.usedByProjects.length > 0 ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        Đang dùng cho:{" "}
                        {repository.usedByProjects
                          .map((project) => project.title)
                          .join(", ")}
                      </span>
                    ) : null}
                  </Button>
                ))}
              </div>
            )}
            {list.kind === "ready" && list.truncated ? (
              <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">
                Gõ tên repository để thu hẹp danh sách. Tìm kiếm quét 1.000
                repository được cập nhật gần nhất.
              </p>
            ) : null}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
