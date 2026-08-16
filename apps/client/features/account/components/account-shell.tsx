import type { User } from "@repo/types";
import { BookOpenText, Gem, LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/system/brand-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@/features/auth/actions/auth";

interface AccountShellProps {
  children: React.ReactNode;
  user: Pick<User, "email" | "username">;
}

const navigation = [
  { href: "/me", label: "Hồ sơ", icon: UserRound },
  { href: "/journal", label: "Journal", icon: BookOpenText },
  { href: "/memories", label: "Ký ức", icon: Gem },
] as const;

export function AccountShell({ children, user }: AccountShellProps) {
  return (
    <div className="min-h-screen">
      <a
        href="#account-content"
        className="sr-only z-60 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Chuyển đến nội dung chính
      </a>

      <header className="surface-glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex min-h-17 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BrandMark className="size-8" />
            <span className="font-display font-semibold tracking-tight">
              Magnum Opus
            </span>
          </Link>

          <div className="ml-auto hidden min-w-0 items-center gap-2 md:flex">
            <span
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">
                @{user.username}
              </span>
              <span className="block max-w-44 truncate text-[11px] text-muted-foreground">
                {user.email}
              </span>
            </span>
          </div>

          <nav
            aria-label="Điều hướng tài khoản"
            className="ml-auto flex items-center gap-1 md:ml-0"
          >
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={buttonVariants({
                  variant: "ghost",
                  className: "px-2 sm:px-2.5",
                })}
              >
                <Icon data-icon="inline-start" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                aria-label="Đăng xuất"
                className="px-2 text-destructive hover:text-destructive sm:px-2.5"
              >
                <LogOut aria-hidden="true" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main
        id="account-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-9 outline-none sm:px-6 sm:py-14"
      >
        {children}
      </main>
    </div>
  );
}
