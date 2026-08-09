"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, type ResetPasswordState } from "../actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    { status: "idle" },
  );
  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col gap-5">
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Mật khẩu đã được thay đổi. Tất cả thiết bị cũ đã đăng xuất.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/login">Đăng nhập bằng mật khẩu mới</Link>
        </Button>
      </div>
    );
  }
  const passwordError =
    state.status === "error" ? state.fieldErrors?.password?.[0] : undefined;
  const confirmError =
    state.status === "error"
      ? state.fieldErrors?.confirmPassword?.[0]
      : undefined;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && state.formError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="new-password">Mật khẩu mới</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "new-password-error" : undefined}
          className="h-11 bg-card/60"
        />
        {passwordError ? (
          <p id="new-password-error" className="text-xs text-destructive">
            {passwordError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">Nhập lại mật khẩu mới</Label>
        <Input
          id="confirm-new-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={confirmError ? true : undefined}
          aria-describedby={confirmError ? "confirm-password-error" : undefined}
          className="h-11 bg-card/60"
        />
        {confirmError ? (
          <p id="confirm-password-error" className="text-xs text-destructive">
            {confirmError}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Đang đổi mật khẩu…" : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
