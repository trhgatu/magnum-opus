import Link from "next/link";

import { BrandMark } from "@/components/system/brand-mark";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.72fr)]">
      <section className="relative hidden overflow-hidden border-r bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -right-48 -top-48 size-[34rem] rounded-full border border-background/15 shadow-[0_0_0_5rem_color-mix(in_oklch,var(--background)_4%,transparent),0_0_0_10rem_color-mix(in_oklch,var(--background)_3%,transparent)]"
        />
        <Link
          href="/"
          className="relative flex w-fit items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <BrandMark className="border-background/30 bg-background/10 text-background shadow-[inset_0_0_0_3px_var(--foreground)]" />
          <span className="font-display text-xl font-semibold">
            Magnum Opus
          </span>
        </Link>
        <blockquote className="relative max-w-xl">
          <p className="font-display text-4xl leading-tight tracking-[-0.025em]">
            “The privilege of a lifetime is to become who you truly are.”
          </p>
          <footer className="mt-5 text-sm text-background/60">Carl Jung</footer>
        </blockquote>
      </section>

      <section className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end lg:p-8">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg lg:hidden"
          >
            <BrandMark className="size-8" />
            <span className="font-display font-semibold">Magnum Opus</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Về trang chủ
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 pt-6 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
