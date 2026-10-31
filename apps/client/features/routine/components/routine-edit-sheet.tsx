"use client";

import type { RoutineDetailResponse } from "@repo/contracts";
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
import { RoutineHabitManager } from "@/features/routine/components/routine-habit-manager";
import { RoutineLifecycleControls } from "@/features/routine/components/routine-lifecycle-controls";

// Form chỉ cần khi mở sheet, nên không nằm trong JS tải lần đầu của trang
// chi tiết. import() phải viết thẳng trong dynamic() thì Next mới nhận ra
// chunk này; loadRoutineEditor chỉ dùng để tải sẵn ở nền.
const RoutineEditor = dynamic(
  () =>
    import("@/features/routine/components/routine-editor").then(
      (module) => module.RoutineEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-xl bg-muted/35" />
    ),
  },
);

const loadRoutineEditor = () =>
  import("@/features/routine/components/routine-editor");

const DISCARD_WARNING =
  "Nội dung chưa được lưu. Đóng lúc này sẽ làm mất phần đang viết.";

/**
 * Tên, nút Lưu trữ và danh sách Thói quen đọc chung một bản `routine`: đổi
 * tên trong sheet xong thì các thao tác khác dùng ngay revision mới, không
 * phải chờ router.refresh() kịp chạy (nếu không sẽ bị 409 dù không có xung
 * đột thật).
 */
const RoutineEditContext = createContext<{
  routine: RoutineDetailResponse;
  openEditor: () => void;
} | null>(null);

function useRoutineEdit() {
  const context = useContext(RoutineEditContext);
  if (!context) {
    throw new Error("Phải nằm trong RoutineEditProvider");
  }
  return context;
}

/** Trang chi tiết Nếp sinh hoạt: một sheet đổi tên, mở từ nút Chỉnh sửa. */
export function RoutineEditProvider({
  initialRoutine,
  children,
}: {
  initialRoutine: RoutineDetailResponse;
  children: ReactNode;
}) {
  const router = useRouter();
  const [routine, setRoutine] = useState(initialRoutine);
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Tải sẵn form sau khi trang đã hiện, để bấm Chỉnh sửa là có ngay.
  useEffect(() => {
    if (initialRoutine.isActive) void loadRoutineEditor();
  }, [initialRoutine.isActive]);

  const close = () => {
    setOpen(false);
    setIsDirty(false);
  };

  const requestClose = () => {
    if (isDirty && !window.confirm(DISCARD_WARNING)) return;
    close();
  };

  return (
    <RoutineEditContext.Provider
      value={{ routine, openEditor: () => setOpen(true) }}
    >
      {children}
      <Sheet
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
      >
        {/* Cùng biến thể data-[side=right] với sheet.tsx thì mới đè được. */}
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="pr-12">
            <SheetTitle>Chỉnh sửa Nếp sinh hoạt</SheetTitle>
            <SheetDescription>
              Những Thói quen đã kết nối và thứ tự thực hiện vẫn được giữ
              nguyên.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <RoutineEditor
              initialRoutine={routine}
              onDirtyChange={setIsDirty}
              onCancel={requestClose}
              onSaved={(saved) => {
                // Giữ nguyên danh sách Thói quen (cùng tham chiếu): đổi tên
                // không đụng tới chúng.
                setRoutine((current) => ({
                  ...current,
                  title: saved.title,
                  revision: saved.revision,
                  updatedAt: saved.updatedAt,
                }));
                close();
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </RoutineEditContext.Provider>
  );
}

export function RoutineDetailTitle() {
  return useRoutineEdit().routine.title;
}

export function RoutineDetailMeta() {
  const { routine } = useRoutineEdit();
  return (
    <>
      <Badge variant="outline">{routine.habits.length} Thói quen</Badge>
      <Badge variant={routine.isActive ? "outline" : "secondary"}>
        {routine.isActive ? "Đang rèn luyện" : "Đã lưu trữ"}
      </Badge>
    </>
  );
}

/** Nút Chỉnh sửa và Lưu trữ/Khôi phục ở đầu trang. */
export function RoutineDetailActions() {
  const { routine, openEditor } = useRoutineEdit();
  return (
    <>
      {routine.isActive ? (
        <Button type="button" variant="outline" onClick={openEditor}>
          <Pencil aria-hidden="true" /> Chỉnh sửa
        </Button>
      ) : null}
      <RoutineLifecycleControls
        id={routine.id}
        title={routine.title}
        isActive={routine.isActive}
        revision={routine.revision}
      />
    </>
  );
}

export function RoutineDetailHabits() {
  return <RoutineHabitManager routine={useRoutineEdit().routine} />;
}
