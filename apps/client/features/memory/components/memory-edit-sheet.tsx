"use client";

import type { MemoryResponse } from "@repo/contracts";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Form kéo theo Calendar và date-fns: chỉ cần khi mở sheet, nên không nằm
// trong JS tải lần đầu của trang chi tiết. import() phải viết thẳng trong
// dynamic() thì Next mới nhận ra chunk này; loadMemoryEditor chỉ dùng để
// tải sẵn ở nền.
const MemoryEditor = dynamic(
  () =>
    import("@/features/memory/components/memory-editor").then(
      (module) => module.MemoryEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[32rem] animate-pulse rounded-xl bg-muted/35" />
    ),
  },
);

const loadMemoryEditor = () =>
  import("@/features/memory/components/memory-editor");

const DISCARD_WARNING =
  "Nội dung chưa được lưu. Đóng lúc này sẽ làm mất phần đang viết.";

/**
 * Nội dung ký ức, nút Chỉnh sửa và nút Thùng rác đọc chung một bản `memory`:
 * lưu trong sheet xong thì các thao tác khác dùng ngay revision mới, không
 * phải chờ router.refresh() kịp chạy (nếu không sẽ bị 409 dù không có xung
 * đột thật).
 */
const MemoryEditContext = createContext<{
  memory: MemoryResponse;
  openEditor: () => void;
} | null>(null);

export function useMemoryEdit() {
  const context = useContext(MemoryEditContext);
  if (!context) {
    throw new Error("Phải nằm trong MemoryEditProvider");
  }
  return context;
}

/** Trang chi tiết ký ức: một sheet chỉnh sửa, mở từ nút Chỉnh sửa. Rộng
 * hơn sheet của Habit/Project vì nội dung ký ức có thể dài. */
export function MemoryEditProvider({
  initialMemory,
  children,
}: {
  initialMemory: MemoryResponse;
  children: ReactNode;
}) {
  const router = useRouter();
  // Bản từ sheet (vừa lưu, hoặc vừa tải khi xung đột) chỉ dùng khi mới hơn
  // bản server đang có. Không remount theo revision: refresh xong trong lúc
  // sheet đang mở thì chữ đang gõ vẫn còn.
  const [latest, setLatest] = useState<MemoryResponse>();
  const memory =
    latest && latest.revision > initialMemory.revision ? latest : initialMemory;
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Tải sẵn form sau khi trang đã hiện, để bấm Chỉnh sửa là có ngay.
  useEffect(() => {
    if (initialMemory.state === "ACTIVE") void loadMemoryEditor();
  }, [initialMemory.state]);

  const close = () => {
    setOpen(false);
    setIsDirty(false);
  };

  const requestClose = () => {
    if (isDirty && !window.confirm(DISCARD_WARNING)) return;
    close();
  };

  return (
    <MemoryEditContext.Provider
      value={{ memory, openEditor: () => setOpen(true) }}
    >
      {children}
      <Sheet
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
      >
        {/* Cùng biến thể data-[side=right] với sheet.tsx thì mới đè được. */}
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
          <SheetHeader className="pr-12">
            <SheetTitle>Chỉnh sửa ký ức</SheetTitle>
            <SheetDescription>
              Điều chỉnh cách khoảnh khắc được ghi lại mà không làm mất nguồn
              gốc và lịch sử chỉnh sửa.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 sm:px-6">
            <MemoryEditor
              initialMemory={memory}
              onDirtyChange={setIsDirty}
              onLatestLoaded={setLatest}
              onCancel={requestClose}
              onSaved={(saved) => {
                setLatest(saved);
                close();
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </MemoryEditContext.Provider>
  );
}
