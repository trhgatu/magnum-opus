"use client";

import type {
  ActivitySourceResponse,
  GitHubConnectionResponse,
  GitHubRepositoryResponse,
} from "@repo/contracts";
import Link from "next/link";
import { type MouseEvent, useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConnectionNow } from "@/features/github/hooks/use-connection-now";
import { connectionHealth } from "@/features/github/lib/github-connection";
import {
  linkActivitySource,
  unlinkActivitySource,
} from "@/features/project-activity/actions/project-activity";
import {
  linkErrorMessage,
  sourceLine,
} from "@/features/project-activity/lib/source-status";
import { notifySuccess } from "@/lib/toast";

import { RepositoryPicker } from "./repository-picker";

/** Kết nối GitHub nhìn từ trang Project: quyết định có gắn thêm được không. */
export type ConnectionState = "none" | "unusable" | "active" | "unavailable";

export function connectionState(
  connection: GitHubConnectionResponse | null | "unavailable",
  now: Date,
): ConnectionState {
  if (connection === "unavailable") return "unavailable";
  if (connection === null) return "none";
  const health = connectionHealth(connection, now).kind;
  return health === "expired" || health === "revoked" ? "unusable" : "active";
}

interface ActivitySourcesSectionProps {
  projectId: string;
  sources: ActivitySourceResponse[];
  /** "unavailable": không đọc được kết nối — vẫn hiện nguồn, không gắn thêm. */
  connection: GitHubConnectionResponse | null | "unavailable";
  timeZone: string;
}

/** Mục "Nguồn hoạt động" ở trang chỉnh sửa Project (06 §7). */
export function ActivitySourcesSection({
  projectId,
  sources: serverSources,
  connection,
  timeZone,
}: ActivitySourcesSectionProps) {
  const [sources, setSources] = useState(serverSources);
  // Server làm mới props (revalidatePath, lần chép mới): lấy lại danh sách.
  const [lastServerSources, setLastServerSources] = useState(serverSources);
  if (serverSources !== lastServerSources) {
    setLastServerSources(serverSources);
    setSources(serverSources);
  }

  const [error, setError] = useState<string>();
  // Tách "đang mở" khỏi "nguồn nào": tiêu đề không trống lúc hộp đang đóng.
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] =
    useState<ActivitySourceResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const now = useConnectionNow(
    connection === "unavailable" ? null : connection,
  );
  const state = connectionState(connection, now);
  const linkedIds = useMemo(
    () => new Set(sources.map((source) => source.externalResourceId)),
    [sources],
  );

  const link = (repository: GitHubRepositoryResponse) => {
    setError(undefined);
    startTransition(async () => {
      const result = await linkActivitySource({
        projectId,
        externalResourceId: repository.externalResourceId,
      });
      if (result.status === "error") {
        setError(linkErrorMessage(result));
        return;
      }
      setSources((current) => [
        ...current.filter((source) => source.feedId !== result.source.feedId),
        result.source,
      ]);
      void notifySuccess(`Đã gắn ${result.source.displayName}`);
    });
  };

  const unlink = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const target = unlinkTarget;
    if (!target) return;
    setError(undefined);
    startTransition(async () => {
      const result = await unlinkActivitySource({
        projectId,
        feedId: target.feedId,
      });
      setUnlinkOpen(false);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setSources((current) =>
        current.filter((source) => source.feedId !== target.feedId),
      );
      void notifySuccess(`Đã gỡ ${target.displayName}`);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Nguồn hoạt động</h2>
        <p className="text-sm text-muted-foreground">
          Gắn repository GitHub để thấy hoạt động thật của từng vòng — đặt cạnh
          trạng thái bạn tuyên bố cho Project.
        </p>
      </div>

      {state === "none" ? (
        <p className="text-sm">
          Cần kết nối GitHub trước.{" "}
          <Link href="/settings" className="underline underline-offset-4">
            Kết nối ở Cài đặt
          </Link>
        </p>
      ) : null}

      {state === "unusable" ? (
        <Alert>
          <AlertDescription>
            Kết nối GitHub không còn dùng được — không gắn thêm được repository.{" "}
            <Link href="/settings" className="underline underline-offset-4">
              Cập nhật token ở Cài đặt
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {state === "unavailable" ? (
        <Alert>
          <AlertDescription>
            Chưa tải được trạng thái kết nối GitHub nên chưa gắn thêm được
            repository. Tải lại trang để thử lại.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {sources.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-lg border">
          {sources.map((source) => {
            const line = sourceLine(source, timeZone, now);
            return (
              <li
                key={source.feedId}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {source.displayName}
                    </span>
                    <Badge
                      variant={
                        line.label === "Lỗi" ? "destructive" : "secondary"
                      }
                    >
                      {line.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{line.detail}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    setUnlinkTarget(source);
                    setUnlinkOpen(true);
                  }}
                  aria-label={`Gỡ ${source.displayName}`}
                >
                  Gỡ
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {state === "active" ? (
        <div>
          <RepositoryPicker
            excludedIds={linkedIds}
            onSelect={link}
            disabled={isPending}
          />
        </div>
      ) : null}

      <AlertDialog
        open={unlinkOpen}
        onOpenChange={(open) => {
          if (!isPending) setUnlinkOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Gỡ {unlinkTarget?.displayName} khỏi Project?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hoạt động của repository này sẽ không còn tính cho vòng đang mở.
              Tóm tắt của các vòng đã đóng không thay đổi. Bạn có thể gắn lại
              bất cứ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={unlink}
            >
              {isPending ? "Đang gỡ..." : "Gỡ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
