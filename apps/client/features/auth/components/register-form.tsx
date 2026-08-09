"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, type RegisterState } from "../actions/auth";

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    register,
    { status: "idle" },
  );
  const error = (
    field: "email" | "username" | "password" | "confirmPassword",
  ) => (state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.status === "error" && state.formError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={
            state.status === "error" ? state.values?.email : undefined
          }
          aria-invalid={error("email") ? true : undefined}
          className="h-11 bg-card/60"
        />
        {error("email") ? (
          <p className="text-xs text-destructive">{error("email")}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-username">Tên hiển thị</Label>
        <Input
          id="register-username"
          name="username"
          autoComplete="username"
          required
          minLength={3}
          defaultValue={
            state.status === "error" ? state.values?.username : undefined
          }
          aria-invalid={error("username") ? true : undefined}
          className="h-11 bg-card/60"
        />
        {error("username") ? (
          <p className="text-xs text-destructive">{error("username")}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-password">Mật khẩu</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={error("password") ? true : undefined}
          className="h-11 bg-card/60"
        />
        {error("password") ? (
          <p className="text-xs text-destructive">{error("password")}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">Nhập lại mật khẩu</Label>
        <Input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={error("confirmPassword") ? true : undefined}
          className="h-11 bg-card/60"
        />
        {error("confirmPassword") ? (
          <p className="text-xs text-destructive">{error("confirmPassword")}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} size="lg" className="w-full">
        {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </Button>
      <Link
        href="/login"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Đã có tài khoản? Đăng nhập
      </Link>
    </form>
  );
}
