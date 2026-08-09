"use client";

import { AlertTriangle } from "lucide-react";
import { BrandMark } from "@/components/system/brand-mark";
import { Button } from "@/components/ui/button";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <BrandMark />
      <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
        Không thể tải nội dung
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Đã xảy ra lỗi tạm thời
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Vui lòng thử lại. Nếu lỗi tiếp tục xảy ra, hãy quay về trang chủ.
      </p>
      <Button type="button" onClick={reset} size="lg">
        Thử lại
      </Button>
    </main>
  );
}
