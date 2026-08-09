import Link from "next/link";
import { BrandMark } from "@/components/system/brand-mark";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <BrandMark />
      <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary">
        404 · LOST PAGE
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Không tìm thấy trang
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Đường dẫn không tồn tại hoặc nội dung đã được di chuyển.
      </p>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Về trang chủ
      </Link>
    </main>
  );
}
