import type { Metadata } from "next";

import { PageHeading } from "@/components/system/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/features/account/api/current-user";
import { TimeZoneField } from "@/features/account/components/time-zone-field";

export const metadata: Metadata = {
  title: "Cài đặt",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <section className="flex flex-col gap-8" aria-labelledby="settings-heading">
      <PageHeading
        id="settings-heading"
        eyebrow="Tài khoản"
        title="Cài đặt"
        description="Những tuỳ chọn quyết định cách Magnum Opus tính ngày và hiển thị cho riêng bạn."
      />

      <Card className="bg-card/70">
        <CardContent className="px-5 py-5 sm:px-7">
          <TimeZoneField timeZone={user.timeZone} />
        </CardContent>
      </Card>
    </section>
  );
}
