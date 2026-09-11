"use client";

import type { HabitResponse } from "@repo/contracts";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useRef, useState, useTransition } from "react";

import { LifecycleErrorAlert } from "@/components/system/lifecycle-error-alert";
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

function useInlineHabitField(habit: HabitResponse) {
  const router = useRouter();
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

      onSettled(true);
      router.refresh();
    });
  };

  return { message, hasConflict, isPending, commit, reloadLatestRevision };
}

export function HabitInlineTitle({ habit }: { habit: HabitResponse }) {
  const canEdit = habit.isActive;
  const { message, hasConflict, isPending, commit, reloadLatestRevision } =
    useInlineHabitField(habit);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(habit.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const headingClassName =
    "font-display text-4xl font-semibold leading-none tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl";

  const startEditing = () => {
    setValue(habit.title);
    setIsEditing(true);
  };

  const cancel = () => {
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
      <div className="flex flex-col gap-2">
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
          <LifecycleErrorAlert
            message={message}
            hasConflict={hasConflict}
            onReload={reloadLatestRevision}
          />
        ) : null}
      </div>
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
  habit,
  placeholder,
}: {
  habit: HabitResponse;
  placeholder: string;
}) {
  const canEdit = habit.isActive;
  const { message, hasConflict, isPending, commit, reloadLatestRevision } =
    useInlineHabitField(habit);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(habit.description ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bodyClassName =
    "max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7";

  const startEditing = () => {
    setValue(habit.description ?? "");
    setIsEditing(true);
  };

  const cancel = () => {
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
      <div className="mt-4 flex max-w-2xl flex-col gap-2">
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
          <LifecycleErrorAlert
            message={message}
            hasConflict={hasConflict}
            onReload={reloadLatestRevision}
          />
        ) : null}
      </div>
    );
  }

  if (!canEdit) {
    return (
      <p className={cn(bodyClassName, "mt-4", !habit.description && "italic")}>
        {habit.description ?? placeholder}
      </p>
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
