import type { Metadata } from "next";
import { AuthHeading } from "@/components/system/auth-heading";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <section className="flex flex-col gap-7">
      <AuthHeading
        title="Đăng nhập"
        description="Tiếp tục từ nơi đã dừng lại. Không gian này vẫn đang chờ."
      />
      <LoginForm next={next ?? "/me"} />
    </section>
  );
}
