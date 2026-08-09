import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Compass, Sparkles } from "lucide-react";

import { BrandMark } from "@/components/system/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sống có chủ đích",
  description:
    "Magnum Opus là không gian riêng để ghi lại, soi chiếu và chủ động kiến tạo đời sống mỗi ngày.",
  openGraph: {
    title: "Magnum Opus — Sống có chủ đích",
    description:
      "Một hệ điều hành cá nhân bắt đầu từ sự chú tâm, không phải năng suất bằng mọi giá.",
    type: "website",
  },
};

const principles = [
  {
    icon: BookOpenText,
    title: "Ghi lại điều đang sống",
    description:
      "Journal giữ suy nghĩ ở đúng hình dạng của nó, trước khi thời gian làm mờ đi.",
  },
  {
    icon: Compass,
    title: "Nhìn thấy phương hướng",
    description:
      "Từ những dấu vết nhỏ, mày nhận ra điều gì đang nuôi dưỡng hoặc kéo mình lệch hướng.",
  },
  {
    icon: Sparkles,
    title: "Chuyển hóa bằng hành động",
    description:
      "Reflection không dừng ở việc hiểu. Nó trở thành lựa chọn cho ngày tiếp theo.",
  },
];

export default function HomePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-22rem] -z-10 size-[42rem] -translate-x-1/2 rounded-full border border-primary/10 shadow-[0_0_0_6rem_color-mix(in_oklch,var(--primary)_3%,transparent),0_0_0_12rem_color-mix(in_oklch,var(--primary)_2%,transparent)]"
      />

      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8"
      >
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <BrandMark />
          <span className="font-display text-lg font-semibold tracking-tight">
            Magnum Opus
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/register">
              Bắt đầu
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-20 pt-20 text-center sm:px-8 sm:pb-28 sm:pt-28">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          The work of a lifetime
        </p>
        <h1 className="text-balance font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-8xl">
          Cuộc đời của mày
          <span className="mt-2 block italic text-primary">
            là đại tác phẩm.
          </span>
        </h1>
        <p className="mt-8 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
          Một không gian riêng để dừng lại, lắng nghe và biến những điều mơ hồ
          thành một đời sống có chủ đích. Không bảng xếp hạng. Không áp lực phải
          trở thành ai khác.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-w-40">
            <Link href="/register">
              Tạo không gian của tôi
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="min-w-40">
            <Link href="/me">Trở về không gian riêng</Link>
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="principles-heading"
        className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28"
      >
        <h2 id="principles-heading" className="sr-only">
          Ba nguyên tắc của Magnum Opus
        </h2>
        <div className="grid overflow-hidden rounded-2xl border bg-card/65 shadow-[0_28px_80px_-50px_color-mix(in_oklch,var(--foreground)_45%,transparent)] backdrop-blur sm:grid-cols-3">
          {principles.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className="relative p-7 sm:p-8 [&:not(:first-child)]:border-t sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-t-0"
            >
              <span className="mb-8 grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="absolute right-7 top-7 font-mono text-xs text-muted-foreground/60">
                0{index + 1}
              </p>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t px-5 py-7 text-center text-xs tracking-wide text-muted-foreground sm:px-8">
        Magnum Opus · A private practice of becoming
      </footer>
    </main>
  );
}
