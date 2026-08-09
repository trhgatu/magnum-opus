"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resendEmailVerification,
  type ResendVerificationState,
} from "../actions/auth";

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<
    ResendVerificationState,
    FormData
  >(resendEmailVerification, { status: "idle" });
  if (state.status === "success")
    return (
      <div role="status" className="flex flex-col gap-5">
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Nếu tài khoản cần xác minh, một liên kết mới đã được gửi.
          </AlertDescription>
        </Alert>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Quay lại đăng nhập
        </Link>
      </div>
    );
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
        <Label htmlFor="verification-email">Email</Label>
        <Input
          id="verification-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.status === "error" ? state.values?.email : email}
          aria-invalid={emailError ? true : undefined}
          className="h-11 bg-card/60"
        />
        {emailError ? (
          <p className="text-xs text-destructive">{emailError}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Đang gửi…" : "Gửi lại liên kết"}
      </Button>
    </form>
  );
}
