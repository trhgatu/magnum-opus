"use client";

import type { HabitResponse } from "@repo/contracts";
import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HabitLifecycleControls } from "@/features/habit/components/habit-lifecycle-controls";
import { formatHabitFrequency } from "@/features/habit/lib/habit-frequency";
import { formatQuitStartedAt } from "@/features/habit/lib/habit-quit";
import { cn } from "@/lib/utils";

// Form kéo theo Select, Calendar và date-fns: chỉ cần khi mở sheet, nên
// không nằm trong JS tải lần đầu của trang chi tiết.
// import() phải viết thẳng trong dynamic() thì Next mới nhận ra chunk này;
// loadHabitEditor chỉ dùng để tải sẵn ở nền.
const HabitEditor = dynamic(
  () =>
    import("@/features/habit/components/habit-editor").then(
      (module) => module.HabitEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-xl bg-muted/35" />
    ),
  },
);

const loadHabitEditor = () =>
  import("@/features/habit/components/habit-editor");

const DISCARD_WARNING =
  "Nội dung chưa được lưu. Đóng lúc này sẽ làm mất phần đang viết.";

/**
 * Tên, mô tả, nút Chỉnh sửa và nút Lưu trữ đọc chung một bản `habit`: lưu
 * trong sheet xong thì Lưu trữ dùng ngay revision mới, không phải chờ
 * router.refresh() kịp chạy (nếu không sẽ bị 409 dù không có xung đột thật).
 */
const HabitEditContext = createContext<{
  habit: HabitResponse;
  openEditor: () => void;
} | null>(null);

function useHabitEdit() {
  const context = useContext(HabitEditContext);
  if (!context) {
    throw new Error("Phải nằm trong HabitEditProvider");
  }
  return context;
}

/** Trang chi tiết thói quen: một sheet chỉnh sửa, mở từ nút Chỉnh sửa. */
export function HabitEditProvider({
  initialHabit,
  children,
}: {
  initialHabit: HabitResponse;
  children: ReactNode;
}) {
  const router = useRouter();
  const [habit, setHabit] = useState(initialHabit);
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Tải sẵn form sau khi trang đã hiện, để bấm Chỉnh sửa là có ngay.
  useEffect(() => {
    if (initialHabit.isActive) void loadHabitEditor();
  }, [initialHabit.isActive]);

  const openEditor = () => setOpen(true);

  const close = () => {
    setOpen(false);
    setIsDirty(false);
  };

  const requestClose = () => {
    if (isDirty && !window.confirm(DISCARD_WARNING)) return;
    close();
  };

  return (
    <HabitEditContext.Provider value={{ habit, openEditor }}>
      {children}
      <Sheet
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
      >
        {/* Cùng biến thể data-[side=right] với sheet.tsx thì mới đè được. */}
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="pr-12">
            <SheetTitle>Chỉnh sửa thói quen</SheetTitle>
            <SheetDescription>
              Thay đổi định nghĩa hoặc lịch thực hiện mà không làm mất lịch sử
              check-in.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <HabitEditor
              initialHabit={habit}
              onDirtyChange={setIsDirty}
              onCancel={requestClose}
              onSaved={(saved) => {
                setHabit(saved);
                close();
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </HabitEditContext.Provider>
  );
}

/** Tên, mô tả, lịch và trạng thái đọc bản vừa lưu, không chờ
 * router.refresh(). */
export function HabitDetailTitle() {
  return useHabitEdit().habit.title;
}

export function HabitDetailDescription({
  placeholder,
}: {
  placeholder: string;
}) {
  const { habit } = useHabitEdit();
  return (
    <span className={cn(!habit.description && "italic")}>
      {habit.description ?? placeholder}
    </span>
  );
}

export function HabitDetailMeta() {
  const { habit } = useHabitEdit();
  return (
    <>
      <Badge>
        {habit.type === "QUIT" && habit.quitStartedAt
          ? `Bắt đầu ${formatQuitStartedAt(habit.quitStartedAt)}`
          : formatHabitFrequency(habit.frequencyType, habit.frequencyDays)}
      </Badge>
      <Badge variant={habit.isActive ? "outline" : "secondary"}>
        {habit.isActive ? "Đang rèn luyện" : "Đã lưu trữ"}
      </Badge>
    </>
  );
}

/** Nút Chỉnh sửa và Lưu trữ/Khôi phục ở đầu trang. */
export function HabitDetailActions() {
  const { habit, openEditor } = useHabitEdit();
  return (
    <>
      {habit.isActive ? (
        <Button type="button" variant="outline" onClick={openEditor}>
          <Pencil aria-hidden="true" /> Chỉnh sửa
        </Button>
      ) : null}
      <HabitLifecycleControls
        id={habit.id}
        title={habit.title}
        isActive={habit.isActive}
        revision={habit.revision}
      />
    </>
  );
}
