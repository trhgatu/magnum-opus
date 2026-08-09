"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { verifyEmail, type VerifyEmailState } from "../actions/auth";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<VerifyEmailState, FormData>(
    verifyEmail,
    { status: "idle" },
  );
  if (state.status === "success")
    return (
      <div role="status" className="flex flex-col gap-5">
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>Email đã được xác minh.</AlertDescription>
        </Alert>
        <Link href="/login" className={buttonVariants()}>
          Đăng nhập
        </Link>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && state.formError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending || token.length < 32} size="lg">
        {pending ? "Đang xác minh…" : "Xác minh email"}
      </Button>
      {token.length < 32 ? (
        <Link
          href="/check-email"
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Gửi lại liên kết
        </Link>
      ) : null}
    </form>
  );
}
