import type { Metadata } from "next";
import { AuthHeading } from "@/components/system/auth-heading";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Tạo tài khoản",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <section className="flex flex-col gap-7">
      <AuthHeading
        title="Tạo tài khoản"
        description="Bắt đầu một không gian riêng để viết, quan sát và chuyển hóa mỗi ngày."
      />
      <RegisterForm />
    </section>
  );
}
