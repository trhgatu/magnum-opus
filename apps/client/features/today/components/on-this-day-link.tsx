"use client";

import type { OnThisDayItemResponse } from "@repo/contracts";
import Link from "next/link";
import type { ReactNode } from "react";

import { openOnThisDayItem } from "@/features/today/actions/on-this-day";

/**
 * Link tới một mục của "Ngày này năm xưa". Chỉ lần chọn thật mới được ghi là
 * nhìn lại, không phải lúc Next tải trước trang (BR-GDN-LN-008).
 */
export function OnThisDayLink({
  item,
  className,
  children,
}: {
  item: OnThisDayItemResponse;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={
        item.kind === "MEMORY" ? `/memories/${item.id}` : `/journal/${item.id}`
      }
      className={className}
      onClick={() => {
        void openOnThisDayItem(item.kind, item.id);
      }}
    >
      {children}
    </Link>
  );
}
