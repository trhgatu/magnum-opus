"use client";

import type { MemoryDatePrecision, MemoryResponse } from "@repo/contracts";
import { BookOpenText, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { ConflictAlert } from "@/components/system/conflict-alert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createMemory,
  reloadMemory,
  updateMemory,
} from "@/features/memory/actions/memory";
import { MemoryDateField } from "@/features/memory/components/memory-date-field";
import {
  memoryOccurredOnInputValue,
  normalizeMemoryOccurredOnInput,
} from "@/features/memory/lib/memory-form";
import { notifySuccess } from "@/lib/toast";

export interface MemoryCreationSeed {
  sourceJournalEntryId: string;
  title: string;
  content: string;
}

type MemoryEditorProps =
  | {
      initialMemory: MemoryResponse;
      creationSeed?: never;
    }
  | {
      initialMemory?: undefined;
      creationSeed?: MemoryCreationSeed;
    };

export function MemoryEditor({
  initialMemory,
  creationSeed,
}: MemoryEditorProps) {
  const router = useRouter();
  const [persistedMemory, setPersistedMemory] = useState(initialMemory);

  const [title, setTitle] = useState(
    initialMemory?.title ?? creationSeed?.title ?? "",
  );

  const [content, setContent] = useState(
    initialMemory?.content ?? creationSeed?.content ?? "",
  );

  const [precision, setPrecision] = useState<MemoryDatePrecision>(
    initialMemory?.occurredOnPrecision ?? "UNKNOWN",
  );

  const [occurredOnInput, setOccurredOnInput] = useState(() =>
    memoryOccurredOnInputValue(
      initialMemory?.occurredOn ?? null,
      initialMemory?.occurredOnPrecision ?? "UNKNOWN",
    ),
  );

  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();
  const [isEditable, setIsEditable] = useState(
    !initialMemory || initialMemory.state === "ACTIVE",
  );
  const [isPending, startTransition] = useTransition();

  const isEditing = Boolean(persistedMemory);

  const cancelHref = persistedMemory
    ? `/memories/${persistedMemory.id}`
    : creationSeed
      ? `/journal/${creationSeed.sourceJournalEntryId}`
      : "/memories";

  const handlePrecisionChange = (nextPrecision: MemoryDatePrecision) => {
    setPrecision(nextPrecision);
    setOccurredOnInput("");
    setMessage(undefined);
    setHasConflict(false);
    setRecoveryError(undefined);
  };

  const applyPersistedMemory = (memory: MemoryResponse) => {
    setPersistedMemory(memory);
    setTitle(memory.title);
    setContent(memory.content);
    setPrecision(memory.occurredOnPrecision);
    setOccurredOnInput(
      memoryOccurredOnInputValue(memory.occurredOn, memory.occurredOnPrecision),
    );
    setMessage(undefined);
    setHasConflict(false);
    setRecoveryError(undefined);
    setIsEditable(memory.state === "ACTIVE");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditable) return;
    setMessage(undefined);
    setRecoveryError(undefined);

    const occurredOn = normalizeMemoryOccurredOnInput(
      occurredOnInput,
      precision,
    );

    if (!occurredOn) {
      setMessage("Thời điểm xảy ra chưa hợp lệ.");
      return;
    }

    startTransition(async () => {
      const result = persistedMemory
        ? await updateMemory({
            id: persistedMemory.id,
            title,
            content,
            occurredOn: occurredOn.occurredOn,
            occurredOnPrecision: occurredOn.occurredOnPrecision,
            expectedRevision: persistedMemory.revision,
          })
        : await createMemory({
            sourceJournalEntryId: creationSeed?.sourceJournalEntryId ?? null,
            title,
            content,
            occurredOn: occurredOn.occurredOn,
            occurredOnPrecision: occurredOn.occurredOnPrecision,
          });

      if (result.status === "error") {
        setMessage(result.message);

        setHasConflict(result.code === "MEMORY_REVISION_CONFLICT");

        return;
      }

      void notifySuccess(
        persistedMemory
          ? `Đã cập nhật "${result.memory.title}"`
          : `Đã lưu ký ức "${result.memory.title}"`,
      );

      router.push(`/memories/${result.memory.id}`);
      router.refresh();
    });
  };

  const resolveConflict = (keepLocal: boolean) => {
    if (!persistedMemory) {
      return;
    }

    setRecoveryError(undefined);

    startTransition(async () => {
      const latest = await reloadMemory(persistedMemory.id);

      if (latest.status === "error") {
        setRecoveryError(latest.message);
        return;
      }

      if (!keepLocal) {
        applyPersistedMemory(latest.memory);
        if (latest.memory.state !== "ACTIVE") {
          setMessage(
            "Ký ức không còn ở trạng thái có thể chỉnh sửa. Nội dung mới nhất đã được hiển thị để xem qua.",
          );
        }
        return;
      }

      if (latest.memory.state !== "ACTIVE") {
        setPersistedMemory(latest.memory);
        setHasConflict(false);
        setIsEditable(false);
        setMessage(
          "Ký ức không còn ở trạng thái có thể chỉnh sửa. Nội dung đang viết vẫn được giữ trên màn hình để sao chép.",
        );
        return;
      }

      const occurredOn = normalizeMemoryOccurredOnInput(
        occurredOnInput,
        precision,
      );

      if (!occurredOn) {
        setRecoveryError("Thời điểm xảy ra chưa hợp lệ.");
        return;
      }

      const result = await updateMemory({
        id: latest.memory.id,
        title,
        content,
        occurredOn: occurredOn.occurredOn,
        occurredOnPrecision: occurredOn.occurredOnPrecision,
        expectedRevision: latest.memory.revision,
      });

      if (result.status === "error") {
        setMessage(result.message);
        setHasConflict(result.code === "MEMORY_REVISION_CONFLICT");
        setRecoveryError(
          result.code === "MEMORY_REVISION_CONFLICT"
            ? "Ký ức lại thay đổi trong lúc xử lý. Nội dung đang viết vẫn được giữ."
            : result.message,
        );
        return;
      }

      void notifySuccess(`Đã cập nhật "${result.memory.title}"`);

      router.push(`/memories/${result.memory.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7" aria-busy={isPending}>
      {creationSeed ? (
        <Alert>
          <BookOpenText aria-hidden="true" />
          <AlertTitle>Được kết tinh từ Nhật ký</AlertTitle>
          <AlertDescription>
            Nội dung đã được điền từ entry nguồn. Có thể chọn lọc và viết lại
            trước khi lưu. Nhật ký sẽ không bị thay đổi.{" "}
            <Link href={`/journal/${creationSeed.sourceJournalEntryId}`}>
              Mở entry nguồn
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {hasConflict ? (
        <ConflictAlert
          title="Ký ức đã được thay đổi ở nơi khác"
          description="Nội dung đang viết vẫn còn nguyên trên màn hình. Chọn bản mới nhất để bỏ phần đang viết, hoặc chủ động ghi nội dung này lên revision mới nhất."
          busy={isPending}
          recoveryError={recoveryError}
          onUseLatest={() => resolveConflict(false)}
          onKeepLocal={() => resolveConflict(true)}
        />
      ) : message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2 border-b pb-7">
        <Label htmlFor="memory-title">Tiêu đề</Label>

        <Input
          id="memory-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
          disabled={isPending}
          placeholder="Tên của khoảnh khắc được lưu giữ"
          className="h-auto border-0 bg-transparent px-0 py-2 font-display text-3xl font-semibold shadow-none focus-visible:ring-0 sm:text-4xl md:text-4xl"
          autoComplete="off"
        />

        <p className="text-xs text-muted-foreground">
          {title.length} / 200 ký tự
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memory-content">Nội dung</Label>

        <Textarea
          id="memory-content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          disabled={isPending}
          placeholder="Điều gì đã xảy ra, cảm giác khi ấy ra sao, điều gì vẫn còn được nhớ..."
          className="min-h-64 resize-y border-0 bg-transparent px-0 font-display text-base leading-8 shadow-none focus-visible:ring-0 sm:text-lg md:text-lg"
        />
      </div>

      <MemoryDateField
        precision={precision}
        value={occurredOnInput}
        disabled={isPending}
        onPrecisionChange={handlePrecisionChange}
        onValueChange={setOccurredOnInput}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className={buttonVariants({
            variant: "outline",
            size: "lg",
          })}
          aria-disabled={isPending}
        >
          Hủy
        </Link>

        <Button type="submit" size="lg" disabled={isPending || !isEditable}>
          <Save data-icon="inline-start" aria-hidden="true" />

          {isPending ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Lưu ký ức"}
        </Button>
      </div>
    </form>
  );
}
