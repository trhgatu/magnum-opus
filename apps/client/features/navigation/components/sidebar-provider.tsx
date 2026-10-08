"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Đọc lựa chọn đã lưu sau khi hydrate — tránh mismatch giữa HTML server
  // render (luôn mặc định mở rộng) và state client, chấp nhận 1 khung hình
  // chớp nhẹ cho người dùng quay lại đã từng thu gọn sidebar.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage có thể bị chặn (chế độ riêng tư) — giữ mặc định mở rộng.
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore — persistence is a nice-to-have, not a requirement.
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggleCollapsed,
        mobileOpen,
        openMobile: () => setMobileOpen(true),
        closeMobile: () => setMobileOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}
