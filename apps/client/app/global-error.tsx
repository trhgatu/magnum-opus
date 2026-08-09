"use client";

import { Button } from "@/components/ui/button";
import "./globals.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
            Magnum Opus
          </p>
          <h1 className="font-display text-3xl font-semibold">
            Ứng dụng đang gặp sự cố
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Không thể dựng giao diện lúc này. Hãy thử tải lại ứng dụng.
          </p>
          <Button type="button" onClick={reset}>
            Tải lại
          </Button>
        </main>
      </body>
    </html>
  );
}
