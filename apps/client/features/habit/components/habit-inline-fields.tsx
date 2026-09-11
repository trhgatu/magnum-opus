"use client";

import type { HabitResponse } from "@repo/contracts";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useRef,
  useState,
  useTransition,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateHabit } from "@/features/habit/actions/habit";
import { cn } from "@/lib/utils";

const isRevisionConflict = (code?: string) =>
  code === "HABIT_REVISION_CONFLICT";

/** Field bất biến theo `type` — luôn gửi kèm nguyên trạng vì PUT /habits/:id
 * nhận toàn bộ object, không có cách cập nhật riêng lẻ title/description. */
function typeFieldsFor(habit: HabitResponse) {
  if (habit.type === "BUILD") {
    return {
      type: "BUILD" as const,
      frequencyType: habit.frequencyType ?? "DAILY",
      frequencyDays: habit.frequencyDays,
    };
  }

  return {
    type: "QUIT" as const,
    quitStartedAt: habit.quitStartedAt ?? "",
  };
}

/** title/description dùng chung `expectedRevision`, nên hai field inline
 * phải chia sẻ một bản `habit` — nếu mỗi field tự giữ prop `habit` riêng,
 * sửa title rồi sửa description ngay sau đó sẽ gửi cùng revision cũ và bị
 * 409 dù hai lần sửa là tuần tự, không thật sự xung đột. */
const HabitFieldsContext = createContext<{
  habit: HabitResponse;
  setHabit: (habit: HabitResponse) => void;
} | null>(null);

function useHabitFields() {
  const context = useContext(HabitFieldsContext);
  if (!context) {
    throw new Error(
      "HabitInlineTitle/HabitInlineDescription phải nằm trong HabitFieldsProvider",
    );
  }
  return context;
}

export function HabitFieldsProvider({
  initialHabit,
  children,
}: {
  initialHabit: HabitResponse;
  children: ReactNode;
}) {
  const [habit, setHabit] = useState(initialHabit);
  return (
    <HabitFieldsContext.Provider value={{ habit, setHabit }}>
      {children}
    </HabitFieldsContext.Provider>
  );
}

/** Lỗi hiển thị ngay trong lúc sửa — dựng bằng phrasing content thuần
 * (span/button, không div) vì nội dung này nằm bên trong <h1>/<p> của
 * ContextHero; một khối `<div>` ở đây là HTML không hợp lệ và trình
 * duyệt sẽ tự đóng thẻ cha, làm vỡ layout. */
function InlineFieldError({
  message,
  hasConflict,
  onReload,
}: {
  message: string;
  hasConflict: boolean;
  onReload: () => void;
}) {
  return (
    <span
      role="alert"
      className="mt-1 block text-sm font-medium text-destructive"
    >
      {message}
      {hasConflict ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="ml-1 h-auto p-0 align-baseline text-destructive"
          // Ngăn nút này lấy focus khi mousedown — nếu không, input/textarea
          // đang sửa sẽ blur trước, tự kích hoạt lưu lại với cùng revision
          // đã xung đột, trước khi onClick reload kịp chạy.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onReload}
        >
          Tải bản mới nhất
        </Button>
      ) : null}
    </span>
  );
}

function useInlineHabitField() {
  const router = useRouter();
  const { habit, setHabit } = useHabitFields();
  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  const clearError = () => {
    setMessage(undefined);
    setHasConflict(false);
  };

  const reloadLatestRevision = () => {
    clearError();
    router.refresh();
  };

  const commit = (
    next: { title: string; description: string | null },
    onSettled: (didSave: boolean) => void,
  ) => {
    clearError();
    startTransition(async () => {
      const result = await updateHabit({
        id: habit.id,
        expectedRevision: habit.revision,
        title: next.title,
        description: next.description,
        ...typeFieldsFor(habit),
      });

      if (result.status === "error") {
        setMessage(
          isRevisionConflict(result.code)
            ? "Thói quen đã thay đổi ở một phiên làm việc khác."
            : result.message,
        );
        setHasConflict(isRevisionConflict(result.code));
        onSettled(false);
        return;
      }

      // Cập nhật ngay bản `habit` dùng chung để field còn lại (title hoặc
      // description) thấy revision mới nhất mà không phải chờ
      // router.refresh() round-trip qua server.
      setHabit(result.habit);
      onSettled(true);
      router.refresh();
    });
  };

  return {
    habit,
    message,
    hasConflict,
    isPending,
    commit,
    clearError,
    reloadLatestRevision,
  };
}

export function HabitInlineTitle() {
  const {
    habit,
    message,
    hasConflict,
    isPending,
    commit,
    clearError,
    reloadLatestRevision,
  } = useInlineHabitField();
  const canEdit = habit.isActive;
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(habit.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const headingClassName =
    "font-display text-4xl font-semibold leading-none tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl";

  const startEditing = () => {
    clearError();
    setValue(habit.title);
    setIsEditing(true);
  };

  const cancel = () => {
    clearError();
    setValue(habit.title);
    setIsEditing(false);
  };

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === habit.title) {
      setValue(habit.title);
      setIsEditing(false);
      return;
    }

    commit({ title: trimmed, description: habit.description }, (didSave) => {
      if (didSave) setIsEditing(false);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      inputRef.current?.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  if (isEditing) {
    return (
      <span className="block">
        <Input
          ref={inputRef}
          autoFocus
          value={value}
          maxLength={200}
          disabled={isPending}
          aria-label="Tên thói quen"
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          onKeyDown={onKeyDown}
          className={cn(
            headingClassName,
            "h-auto w-full rounded-md border-0 border-b border-dashed border-input bg-transparent px-0 py-0 shadow-none focus-visible:ring-0",
          )}
        />
        {message ? (
          <InlineFieldError
            message={message}
            hasConflict={hasConflict}
            onReload={reloadLatestRevision}
          />
        ) : null}
      </span>
    );
  }

  if (!canEdit) {
    return <span className={headingClassName}>{habit.title}</span>;
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        headingClassName,
        "group inline-flex w-full items-baseline gap-2 rounded-md text-left hover:cursor-text",
      )}
    >
      {habit.title}
      <Pencil
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
      />
    </button>
  );
}

export function HabitInlineDescription({
  placeholder,
}: {
  placeholder: string;
}) {
  const {
    habit,
    message,
    hasConflict,
    isPending,
    commit,
    clearError,
    reloadLatestRevision,
  } = useInlineHabitField();
  const canEdit = habit.isActive;
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(habit.description ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bodyClassName =
    "max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7";

  const startEditing = () => {
    clearError();
    setValue(habit.description ?? "");
    setIsEditing(true);
  };

  const cancel = () => {
    clearError();
    setValue(habit.description ?? "");
    setIsEditing(false);
  };

  const save = () => {
    const trimmed = value.trim();
    if (trimmed === (habit.description ?? "")) {
      setIsEditing(false);
      return;
    }

    commit({ title: habit.title, description: trimmed || null }, (didSave) => {
      if (didSave) setIsEditing(false);
    });
  };

  if (isEditing) {
    return (
      <span className="mt-4 block max-w-2xl">
        <Textarea
          ref={textareaRef}
          autoFocus
          value={value}
          disabled={isPending}
          aria-label="Mô tả thói quen"
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          className={cn(
            bodyClassName,
            "min-h-16 rounded-md border-dashed bg-transparent px-2.5 py-1.5",
          )}
        />
        {message ? (
          <InlineFieldError
            message={message}
            hasConflict={hasConflict}
            onReload={reloadLatestRevision}
          />
        ) : null}
      </span>
    );
  }

  if (!canEdit) {
    return (
      <span
        className={cn(
          bodyClassName,
          "mt-4 block",
          !habit.description && "italic",
        )}
      >
        {habit.description ?? placeholder}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        bodyClassName,
        "group mt-4 inline-flex w-full items-start gap-2 rounded-md text-left hover:cursor-text",
        !habit.description && "italic",
      )}
    >
      <span>{habit.description ?? `${placeholder} Bấm để thêm mô tả.`}</span>
      <Pencil
        className="mt-1 size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
      />
    </button>
  );
}
