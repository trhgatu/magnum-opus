import type { User } from "@repo/types";
import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import { logout } from "@/features/auth/actions/auth";

interface AccountMenuProps {
  user: Pick<User, "email" | "username">;
}

export function AccountMenu({ user }: AccountMenuProps) {
  return (
    <details className="group relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        aria-label={`Mở menu tài khoản của ${user.username}`}
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-36 truncate text-xs font-medium">
            @{user.username}
          </span>
          <span className="block max-w-44 truncate text-[11px] text-muted-foreground">
            {user.email}
          </span>
        </span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border bg-popover p-1 text-sm text-popover-foreground shadow-lg">
        <div className="px-2 py-2">
          <span className="block truncate font-medium">@{user.username}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          href="/me"
          className="flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
        >
          <UserRound className="size-4" aria-hidden="true" />
          Hồ sơ cá nhân
        </Link>
        <div className="my-1 h-px bg-border" />
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Đăng xuất
          </button>
        </form>
      </div>
    </details>
  );
}
