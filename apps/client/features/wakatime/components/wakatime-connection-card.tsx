"use client";

import type { WakaTimeConnectionResponse } from "@repo/contracts";
import {
  type FormEvent,
  type MouseEvent,
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
import { formatDateTime } from "@/features/project-activity/lib/activity-presentation";
import {
  connectWakaTime,
  disconnectWakaTime,
} from "@/features/wakatime/actions/wakatime";
import {
  type AccountChange,
  accountChangeOf,
  connectErrorMessage,
} from "@/features/wakatime/lib/wakatime-connection";
import { notifySuccess } from "@/lib/toast";

interface WakaTimeConnectionCardProps {
  connection: WakaTimeConnectionResponse | null;
  timeZone: string;
}

/** Card "Kết nối WakaTime" trong Cài đặt (08 §7.1). Không bao giờ hiển thị key. */
export function WakaTimeConnectionCard({
  connection: initial,
  timeZone,
}: WakaTimeConnectionCardProps) {
  const [connection, setConnection] = useState(initial);
  // Chưa kết nối, hoặc key không còn dùng được: mở sẵn ô nhập.
  const [editing, setEditing] = useState(
    initial === null || initial.status === "REVOKED",
  );
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string>();
  const [accountChange, setAccountChange] = useState<AccountChange | null>(
    null,
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const keyId = useId();
  const guidanceId = useId();

  const connect = (confirmAccountChange: boolean) => {
    setError(undefined);
    startTransition(async () => {
      const result = await connectWakaTime({ apiKey, confirmAccountChange });

      if (result.status === "error") {
        const change = accountChangeOf(result);
        if (change) {
          setAccountChange(change);
          return;
        }
        // Lỗi không xóa key vừa dán.
        setError(connectErrorMessage(result));
        setAccountChange(null);
        return;
      }

      const replaced = connection !== null;
      setConnection(result.connection);
      setEditing(false);
      setApiKey("");
      setAccountChange(null);
      void notifySuccess(
        replaced ? "Đã cập nhật API key WakaTime" : "Đã kết nối WakaTime",
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
      const result = await disconnectWakaTime();
      if (result.status === "error") {
        setError(result.message);
        setDisconnecting(false);
        return;
      }
      setConnection(null);
      setEditing(true);
      setApiKey("");
      setDisconnecting(false);
      void notifySuccess("Đã ngắt kết nối WakaTime");
    });
  };

  const usable = connection?.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Kết nối WakaTime</h2>
        <p className="text-sm text-muted-foreground">
          Magnum Opus chỉ đọc thời gian code của từng project để làm bằng chứng
          hoạt động. Không đọc ngôn ngữ, editor hay nội dung file.
        </p>
      </div>

      {connection ? (
        usable ? (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              Đã kết nối với <strong>{connection.account.username}</strong>
            </p>
            <p className="text-muted-foreground">
              Kiểm tra lần cuối{" "}
              {formatDateTime(connection.lastVerifiedAt, timeZone)}
            </p>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              API key không còn dùng được — dán key mới để tiếp tục.
            </AlertDescription>
          </Alert>
        )
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {editing ? (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <KeyGuidance id={guidanceId} />
          <div className="grid gap-2">
            <Label htmlFor={keyId}>API key</Label>
            <Input
              id={keyId}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              aria-describedby={guidanceId}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={isPending || apiKey.trim() === ""}>
              {isPending
                ? "Đang kiểm tra..."
                : connection
                  ? "Lưu key mới"
                  : "Kết nối"}
            </Button>
            {usable ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setEditing(false);
                  setApiKey("");
                  setError(undefined);
                }}
              >
                Hủy
              </Button>
            ) : connection ? (
              // Key hỏng: ô nhập luôn mở, nên ngắt kết nối nằm ở đây.
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setDisconnecting(true)}
              >
                Ngắt kết nối
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {connection && !editing ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setEditing(true)}
          >
            Thay key
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
            <AlertDialogTitle>
              Đổi sang tài khoản WakaTime khác?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Key này thuộc tài khoản{" "}
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
            <AlertDialogTitle>Ngắt kết nối WakaTime?</AlertDialogTitle>
            <AlertDialogDescription>
              Magnum Opus sẽ xóa API key và ngừng cập nhật thời gian code. Hoạt
              động đã có và các tóm tắt của vòng đã đóng vẫn được giữ nguyên.
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

function KeyGuidance({ id }: { id: string }) {
  return (
    <ol
      id={id}
      className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground"
    >
      <li>
        Mở wakatime.com/settings/api-key và sao chép API key (bắt đầu bằng
        &quot;waka_&quot;).
      </li>
      <li>Dán vào ô dưới đây. Key được mã hóa và không bao giờ hiện lại.</li>
    </ol>
  );
}
