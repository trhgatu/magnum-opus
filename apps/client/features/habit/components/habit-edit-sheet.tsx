"use client";

import type { HabitResponse } from "@repo/contracts";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HabitEditor } from "@/features/habit/components/habit-editor";
import { HabitLifecycleControls } from "@/features/habit/components/habit-lifecycle-controls";
import { cn } from "@/lib/utils";

type HabitField = "title" | "description";

const DISCARD_WARNING =
  "Nội dung chưa được lưu. Đóng lúc này sẽ làm mất phần đang viết.";

/**
 * Tên, mô tả, nút Chỉnh sửa và nút Lưu trữ đọc chung một bản `habit`: lưu
 * trong sheet xong thì Lưu trữ dùng ngay revision mới, không phải chờ
 * router.refresh() kịp chạy (nếu không sẽ bị 409 dù không có xung đột thật).
 */
const HabitEditContext = createContext<{
  habit: HabitResponse;
  openEditor: (field: HabitField) => void;
} | null>(null);

function useHabitEdit() {
  const context = useContext(HabitEditContext);
  if (!context) {
    throw new Error("Phải nằm trong HabitEditProvider");
  }
  return context;
}

/** Trang chi tiết thói quen: một sheet chỉnh sửa, mở từ nút Chỉnh sửa hoặc
 * bấm thẳng vào tên/mô tả (con trỏ vào sẵn đúng ô đó). */
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
  const [focusField, setFocusField] = useState<HabitField>("title");
  const [isDirty, setIsDirty] = useState(false);

  const openEditor = (field: HabitField) => {
    setFocusField(field);
    setOpen(true);
  };

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
              focusField={focusField}
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

const pencilClassName =
  "shrink-0 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80";

export function HabitEditableTitle() {
  const { habit, openEditor } = useHabitEdit();
  if (!habit.isActive) return habit.title;

  return (
    <button
      type="button"
      onClick={() => openEditor("title")}
      className="group inline-flex items-baseline gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {habit.title}
      <Pencil className={cn(pencilClassName, "size-4")} aria-hidden="true" />
    </button>
  );
}

export function HabitEditableDescription({
  placeholder,
}: {
  placeholder: string;
}) {
  const { habit, openEditor } = useHabitEdit();
  const text = habit.description ?? placeholder;
  if (!habit.isActive) {
    return <span className={cn(!habit.description && "italic")}>{text}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => openEditor("description")}
      className={cn(
        "group inline-flex items-start gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        !habit.description && "italic",
      )}
    >
      <span>{habit.description ?? `${placeholder} Bấm để thêm mô tả.`}</span>
      <Pencil
        className={cn(pencilClassName, "mt-1 size-3.5")}
        aria-hidden="true"
      />
    </button>
  );
}

/** Nút Chỉnh sửa và Lưu trữ/Khôi phục ở đầu trang. */
export function HabitDetailActions() {
  const { habit, openEditor } = useHabitEdit();
  return (
    <>
      {habit.isActive ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => openEditor("title")}
        >
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
