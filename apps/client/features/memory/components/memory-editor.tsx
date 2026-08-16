"use client";

import type { MemoryDatePrecision, MemoryResponse } from "@repo/contracts";
import { BookOpenText, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

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
import { MemoryConflictAlert } from "@/features/memory/components/memory-conflict-alert";
import {
  memoryOccurredOnInputValue,
  normalizeMemoryOccurredOnInput,
} from "@/features/memory/lib/memory-form";

const precisionOptions: ReadonlyArray<{
  value: MemoryDatePrecision;
  label: string;
}> = [
  {
    value: "DAY",
    label: "Ngày cụ thể",
  },
  {
    value: "MONTH",
    label: "Tháng",
  },
  {
    value: "YEAR",
    label: "Năm",
  },
  {
    value: "UNKNOWN",
    label: "Không rõ thời gian",
  },
];

function occurredOnInputType(
  precision: MemoryDatePrecision,
): "date" | "month" | "number" {
  if (precision === "DAY") {
    return "date";
  }

  if (precision === "MONTH") {
    return "month";
  }

  return "number";
}

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
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        return;
      }

      if (latest.memory.state !== "ACTIVE") {
        setPersistedMemory(latest.memory);
        setHasConflict(false);
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

      router.push(`/memories/${result.memory.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isPending}>
      {creationSeed ? (
        <Alert>
          <BookOpenText aria-hidden="true" />
          <AlertTitle>Được kết tinh từ Journal</AlertTitle>
          <AlertDescription>
            Nội dung đã được điền từ entry nguồn. Có thể chọn lọc và viết lại
            trước khi lưu. Journal sẽ không bị thay đổi.{" "}
            <Link href={`/journal/${creationSeed.sourceJournalEntryId}`}>
              Mở entry nguồn
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {hasConflict ? (
        <MemoryConflictAlert
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

      <div className="space-y-2">
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
          className="min-h-56 resize-y leading-7"
        />
      </div>

      <fieldset
        className="space-y-4 rounded-2xl border bg-card/45 p-4 sm:p-5"
        disabled={isPending}
      >
        <legend className="px-1 text-sm font-medium">Thời điểm xảy ra</legend>

        <div className="space-y-2">
          <Label htmlFor="memory-date-precision">
            Độ chính xác của thời gian
          </Label>

          <select
            id="memory-date-precision"
            name="occurredOnPrecision"
            value={precision}
            onChange={(event) =>
              handlePrecisionChange(event.target.value as MemoryDatePrecision)
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {precisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {precision === "UNKNOWN" ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Ký ức vẫn có thể được lưu khi thời điểm xảy ra không còn được nhớ
            chính xác.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="memory-occurred-on">Thời điểm xảy ra</Label>

            <Input
              id="memory-occurred-on"
              name="occurredOn"
              type={occurredOnInputType(precision)}
              value={occurredOnInput}
              onChange={(event) => setOccurredOnInput(event.target.value)}
              min={precision === "YEAR" ? 1 : undefined}
              max={precision === "YEAR" ? 9999 : undefined}
              step={precision === "YEAR" ? 1 : undefined}
              required
            />
          </div>
        )}
      </fieldset>

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

        <Button type="submit" size="lg" disabled={isPending}>
          <Save data-icon="inline-start" aria-hidden="true" />

          {isPending ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Lưu ký ức"}
        </Button>
      </div>
    </form>
  );
}
