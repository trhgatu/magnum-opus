import type { Metadata } from "next";
import { AuthHeading } from "@/components/system/auth-heading";
import { RequestPasswordResetForm } from "@/features/auth/components/request-password-reset-form";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="flex flex-col gap-7">
      <AuthHeading
        title="Quên mật khẩu"
        description="Nhập email đã dùng để đăng ký. Vì sự riêng tư, kết quả luôn giống nhau dù tài khoản có tồn tại hay không."
      />
      <RequestPasswordResetForm />
    </section>
  );
}
