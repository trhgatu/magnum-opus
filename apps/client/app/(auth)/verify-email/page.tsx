import type { Metadata } from "next";
import { AuthHeading } from "@/components/system/auth-heading";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

export const metadata: Metadata = {
  title: "Xác minh email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <section className="flex flex-col gap-7">
      <AuthHeading
        title="Xác minh email"
        description="Xác nhận địa chỉ email để bảo vệ quyền sở hữu không gian này."
      />
      <VerifyEmailForm token={token} />
    </section>
  );
}
