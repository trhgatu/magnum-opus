"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordReset,
  type RequestPasswordResetState,
} from "../actions/auth";

export function RequestPasswordResetForm() {
  const [state, action, pending] = useActionState<
    RequestPasswordResetState,
    FormData
  >(requestPasswordReset, { status: "idle" });

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col gap-5">
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Nếu tài khoản tồn tại, chúng tôi đã gửi một liên kết có hiệu lực
            trong 30 phút.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/login">Quay lại đăng nhập</Link>
        </Button>
      </div>
    );
  }

  const emailError =
    state.status === "error" ? state.fieldErrors?.email?.[0] : undefined;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.status === "error" && state.formError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={
            state.status === "error" ? state.values?.email : undefined
          }
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "reset-email-error" : undefined}
          className="h-11 bg-card/60"
        />
        {emailError ? (
          <p id="reset-email-error" className="text-xs text-destructive">
            {emailError}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Đang gửi…" : "Gửi liên kết đặt lại"}
      </Button>
      <Link
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        href="/login"
      >
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
