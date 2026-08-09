import type { Metadata } from "next";
import { CheckCircle2, Mail, Shield, UserRound } from "lucide-react";

import { PageHeading } from "@/components/system/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/features/account/api/current-user";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân",
  robots: { index: false, follow: false },
};

export default async function MePage() {
  // Layout và page cùng gọi query được React cache theo request, nên backend
  // chỉ nhận một request /users/me dù cả shell lẫn feature đều cần user.
  const user = await getCurrentUser();

  return (
    <section className="flex flex-col gap-8" aria-labelledby="profile-heading">
      <PageHeading
        id="profile-heading"
        eyebrow="Tài khoản"
        title="Hồ sơ cá nhân"
        description="Thông tin định danh mà Magnum Opus đang sử dụng cho không gian riêng này."
      />

      <Card className="overflow-hidden bg-card/70 py-0">
        <CardContent className="p-0">
          <dl className="divide-y">
            {[
              { icon: Mail, label: "Email", value: user.email },
              {
                icon: UserRound,
                label: "Tên đăng nhập",
                value: "@" + user.username,
              },
              {
                icon: Shield,
                label: "Vai trò",
                value: user.roles.join(", ") || "—",
              },
              {
                icon: CheckCircle2,
                label: "Trạng thái",
                value: user.isActive ? "Đang hoạt động" : "Đã khóa",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="grid gap-2 px-5 py-5 sm:grid-cols-[12rem_1fr] sm:items-center sm:px-7"
              >
                <dt className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Icon className="size-4 text-primary" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="text-sm font-medium sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}
