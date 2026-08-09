"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutMenuItem({ action }: { action: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={isPending}
      onSelect={() => {
        startTransition(() => {
          void action();
        });
      }}
    >
      <LogOut aria-hidden="true" />
      {isPending ? "Đang đăng xuất…" : "Đăng xuất"}
    </DropdownMenuItem>
  );
}
