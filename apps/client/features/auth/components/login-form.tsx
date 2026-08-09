"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/features/auth/actions/auth";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Client Component duy nhất ở đây, chỉ để hiện lỗi và trạng thái đang gửi.
// Bản thân việc đăng nhập chạy trong Server Action — mật khẩu không đi qua
// JavaScript phía trình duyệt nhiều hơn mức cần thiết.
export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    { status: "idle" },
  );
  const emailError =
    state.status === "error" ? state.fieldErrors?.email?.[0] : undefined;
  const passwordError =
    state.status === "error" ? state.fieldErrors?.password?.[0] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.status === "error" && state.formError ? (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription>{state.formError}</AlertDescription>
          {state.correlationId ? (
            <span className="mt-1 block font-mono text-xs">
              Mã hỗ trợ: {state.correlationId}
            </span>
          ) : null}
        </Alert>
      ) : null}

      {state.verificationRequired && state.status === "error" ? (
        <Link
          href={`/check-email?email=${encodeURIComponent(state.values?.email ?? "")}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Gửi lại email xác minh
        </Link>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={
            state.status === "error" ? state.values?.email : undefined
          }
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
          className="h-11 bg-card/60"
        />
        {emailError ? (
          <p id="email-error" className="text-xs text-destructive">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Mật khẩu</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-error" : undefined}
          className="h-11 bg-card/60"
        />
        {passwordError ? (
          <p id="password-error" className="text-xs text-destructive">
            {passwordError}
          </p>
        ) : null}
      </div>

      <Link
        href="/forgot-password"
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Quên mật khẩu?
      </Link>

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
      <Link
        href="/register"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Chưa có tài khoản? Tạo tài khoản
      </Link>
    </form>
  );
}
