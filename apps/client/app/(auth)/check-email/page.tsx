import type { Metadata } from "next";
import { AuthHeading } from "@/components/system/auth-heading";
import { ResendVerificationForm } from "@/features/auth/components/resend-verification-form";

export const metadata: Metadata = {
  title: "Kiểm tra email",
  robots: { index: false, follow: false },
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <section className="flex flex-col gap-7">
      <AuthHeading
        title="Kiểm tra email"
        description="Liên kết xác minh có hiệu lực trong 24 giờ. Nếu chưa nhận được, có thể yêu cầu gửi lại."
      />
      <ResendVerificationForm email={email} />
    </section>
  );
}
