"use client";

import type { GitHubConnectionResponse } from "@repo/contracts";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  connectGitHub,
  disconnectGitHub,
} from "@/features/github/actions/github";
import {
  type AccountChange,
  accountChangeOf,
  connectErrorMessage,
  connectionHealth,
  nextHealthChangeAt,
} from "@/features/github/lib/github-connection";
import { formatInstantDay } from "@/features/project/lib/cycle-dates";
import { notifySuccess } from "@/lib/toast";

interface GitHubConnectionCardProps {
  connection: GitHubConnectionResponse | null;
  timeZone: string;
}

/** Card "Kết nối GitHub" trong Cài đặt (06 §6). Không bao giờ hiển thị token. */
export function GitHubConnectionCard({
  connection: initial,
  timeZone,
}: GitHubConnectionCardProps) {
  const [connection, setConnection] = useState(initial);
  const [editing, setEditing] = useState(initial === null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string>();
  const [accountChange, setAccountChange] = useState<AccountChange | null>(
    null,
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const tokenId = useId();
  const guidanceId = useId();

  const connect = (confirmAccountChange: boolean) => {
    setError(undefined);
    startTransition(async () => {
      const result = await connectGitHub({ token, confirmAccountChange });

      if (result.status === "error") {
        const change = accountChangeOf(result);
        if (change) {
          setAccountChange(change);
          return;
        }
        // Lỗi không xóa token vừa dán (06 §6.4).
        setError(connectErrorMessage(result));
        setAccountChange(null);
        return;
      }

      const replaced = connection !== null;
      setConnection(result.connection);
      setEditing(false);
      setToken("");
      setAccountChange(null);
      void notifySuccess(
        replaced ? "Đã cập nhật token GitHub" : "Đã kết nối GitHub",
      );
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    connect(false);
  };

  const confirmAccountChange = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    connect(true);
  };

  const disconnect = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await disconnectGitHub();
      if (result.status === "error") {
        setError(result.message);
        setDisconnecting(false);
        return;
      }
      setConnection(null);
      setEditing(true);
      setDisconnecting(false);
      void notifySuccess("Đã ngắt kết nối GitHub");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Kết nối GitHub</h2>
        <p className="text-sm text-muted-foreground">
          Magnum Opus chỉ đọc commit và pull request của chính bạn để làm bằng
          chứng hoạt động cho Project. Không bao giờ ghi gì lên GitHub.
        </p>
      </div>

      {connection ? (
        <ConnectionStatus connection={connection} timeZone={timeZone} />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {editing ? (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <TokenGuidance id={guidanceId} />
          <div className="grid gap-2">
            <Label htmlFor={tokenId}>Fine-grained personal access token</Label>
            <Input
              id={tokenId}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              aria-describedby={guidanceId}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={isPending || token.trim() === ""}>
              {isPending
                ? "Đang kiểm tra..."
                : connection
                  ? "Lưu token mới"
                  : "Kết nối"}
            </Button>
            {connection ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setEditing(false);
                  setToken("");
                  setError(undefined);
                }}
              >
                Hủy
              </Button>
            ) : null}
          </div>
        </form>
      ) : connection ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setEditing(true)}
          >
            Thay token
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => setDisconnecting(true)}
          >
            Ngắt kết nối
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={accountChange !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setAccountChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi sang tài khoản GitHub khác?</AlertDialogTitle>
            <AlertDialogDescription>
              Token này thuộc tài khoản{" "}
              <strong>{accountChange?.newAccount}</strong>, khác với{" "}
              <strong>{accountChange?.currentAccount}</strong> đang kết nối. Các
              nguồn hoạt động đã gắn bằng{" "}
              <strong>{accountChange?.currentAccount}</strong> sẽ ngừng được cập
              nhật. Hoạt động đã có và các tóm tắt của vòng đã đóng vẫn được giữ
              nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={confirmAccountChange}
            >
              {isPending ? "Đang đổi..." : "Đổi tài khoản"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={disconnecting}
        onOpenChange={(open) => {
          if (!isPending) setDisconnecting(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ngắt kết nối GitHub?</AlertDialogTitle>
            <AlertDialogDescription>
              Magnum Opus sẽ xóa token và ngừng cập nhật mọi nguồn hoạt động.
              Hoạt động đã có và các tóm tắt của vòng đã đóng vẫn được giữ
              nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={disconnect}
            >
              {isPending ? "Đang ngắt..." : "Ngắt kết nối"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConnectionStatus({
  connection,
  timeZone,
}: {
  connection: GitHubConnectionResponse;
  timeZone: string;
}) {
  const now = useNow(connection);
  const health = connectionHealth(connection, now);

  if (health.kind === "expired" || health.kind === "revoked") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Kết nối không còn dùng được:{" "}
          {health.kind === "expired"
            ? "token đã hết hạn."
            : "GitHub đã thu hồi token."}{" "}
          Thay bằng token mới để tiếp tục cập nhật hoạt động.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        Đã kết nối: <strong>{connection.accountLogin}</strong>
      </p>
      <p className="text-muted-foreground">
        {health.expiresAt
          ? `Token hết hạn ${formatInstantDay(health.expiresAt, timeZone)}`
          : "Token không có ngày hết hạn"}
      </p>
      {health.kind === "expiring" ? (
        <Alert>
          <AlertDescription>
            Token hết hạn sau {health.daysLeft} ngày. Tạo token mới và thay
            trước ngày đó để không gián đoạn.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

/** setTimeout tối đa ~24,8 ngày; mốc xa hơn thì hẹn lại giữa chừng. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * "Bây giờ", cập nhật đúng lúc trạng thái hiển thị đổi (bắt đầu nhắc, hết
 * hạn) — trang Cài đặt mở lâu không giữ trạng thái cũ.
 */
function useNow(connection: GitHubConnectionResponse): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const next = nextHealthChangeAt(connection, now);
    if (!next) return;
    const timer = setTimeout(
      () => setNow(new Date()),
      Math.min(next.getTime() - Date.now() + 1, MAX_TIMEOUT_MS),
    );
    return () => clearTimeout(timer);
  }, [connection, now]);

  return now;
}

function TokenGuidance({ id }: { id: string }) {
  return (
    <div id={id} className="flex flex-col gap-2 text-sm text-muted-foreground">
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Trên GitHub: Settings → Developer settings → Fine-grained tokens →
          Generate new token.
        </li>
        <li>
          Repository access: chọn các repository muốn dùng (có thể gồm
          repository private).
        </li>
        <li>Permissions: Contents — Read-only; Pull requests — Read-only.</li>
        <li>
          Expiration: tùy bạn; Magnum Opus sẽ nhắc trước khi token hết hạn.
        </li>
      </ol>
      <p>
        Commit chỉ được tính cho bạn khi email của commit đã được xác minh trên
        tài khoản GitHub.
      </p>
    </div>
  );
}
