import type { Metadata } from "next";
import { AuthHeading } from "@/components/system/auth-heading";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <section className="flex flex-col gap-7">
      <AuthHeading
        title="Đặt lại mật khẩu"
        description="Chọn một mật khẩu mới đủ dài, an toàn và dễ ghi nhớ."
      />
      <ResetPasswordForm token={token} />
    </section>
  );
}
