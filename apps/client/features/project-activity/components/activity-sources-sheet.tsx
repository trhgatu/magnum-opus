"use client";

import { Cable } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Nút "Nguồn hoạt động" ở đầu trang chi tiết Project: mở sheet gắn/gỡ nguồn.
 * Nội dung đến từ server (ActivitySourcesPanel) nên nhận qua children.
 */
export function ActivitySourcesSheet({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Cable aria-hidden="true" /> Nguồn hoạt động
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pr-12">
          <SheetTitle>Nguồn hoạt động</SheetTitle>
          <SheetDescription>
            Gắn repository GitHub hoặc project WakaTime để thấy hoạt động thật
            của từng vòng — đặt cạnh trạng thái bạn tuyên bố cho Project.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
