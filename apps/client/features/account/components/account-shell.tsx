import type { User } from "@repo/types";
import { BookOpenText, ChevronDown, UserRound } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/system/brand-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutMenuItem } from "@/features/account/components/logout-menu-item";
import { logout } from "@/features/auth/actions/auth";

interface AccountShellProps {
  children: React.ReactNode;
  user: Pick<User, "email" | "username">;
}

const navigation = [
  { href: "/me", label: "Hồ sơ", icon: UserRound },
  { href: "/journal", label: "Journal", icon: BookOpenText },
] as const;

export function AccountShell({ children, user }: AccountShellProps) {
  return (
    <div className="min-h-screen">
      <a
        href="#account-content"
        className="sr-only z-[60] rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
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

          <nav
            aria-label="Điều hướng tài khoản"
            className="ml-auto hidden items-center gap-1 sm:flex"
          >
            {navigation.map(({ href, label, icon: Icon }) => (
              <Button key={href} asChild variant="ghost">
                <Link href={href}>
                  <Icon data-icon="inline-start" aria-hidden="true" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label="Mở menu tài khoản"
                className="ml-auto gap-2 bg-card/60 sm:ml-0"
              >
                <span
                  aria-hidden="true"
                  className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                >
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-40 truncate sm:inline">
                  @{user.username}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <span className="block text-xs text-muted-foreground">
                  Đăng nhập với
                </span>
                <span className="mt-1 block truncate text-sm font-medium">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="sm:hidden">
                {navigation.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href}>
                      <Icon aria-hidden="true" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>
              <LogoutMenuItem action={logout} />
            </DropdownMenuContent>
          </DropdownMenu>
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
