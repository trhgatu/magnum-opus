import type { User } from "@repo/types";

import { AccountMenu } from "@/features/navigation/components/account-menu";
import { AppSidebar } from "@/features/navigation/components/app-sidebar";
import { MobileNavigation } from "@/features/navigation/components/mobile-navigation";

interface AccountShellProps {
  children: React.ReactNode;
  user: Pick<User, "email" | "username">;
}

export function AccountShell({ children, user }: AccountShellProps) {
  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#account-content"
        className="sr-only z-60 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Chuyển đến nội dung chính
      </a>

      <AppSidebar />

      <div className="min-w-0 flex-1">
        <header className="surface-glass sticky top-0 z-40 border-b">
          <div className="flex min-h-17 items-center gap-3 px-4 sm:px-6">
            <MobileNavigation />
            <p className="hidden text-xs uppercase tracking-[0.16em] text-muted-foreground sm:block">
              Không gian riêng
            </p>
            <div className="ml-auto">
              <AccountMenu user={user} />
            </div>
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
    </div>
  );
}
