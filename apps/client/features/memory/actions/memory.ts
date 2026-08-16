"use server";

import {
  MEMORY_DATE_PRECISIONS,
  type MemoryDatePrecision,
  type MemoryResponse,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { isValidMemoryCalendarDate } from "@/features/memory/lib/memory-date";

import {
  ApiError,
  apiFetch,
  type ApiErrorKind,
  toPublicApiError,
} from "@/lib/api";

interface MemoryMutationError {
  status: "error";
  message: string;
  kind?: ApiErrorKind;
  code?: string;
  correlationId?: string;
}

export type MemoryMutationResult =
  | {
      status: "success";
      memory: MemoryResponse;
    }
  | MemoryMutationError;

export interface CreateMemoryInput {
  sourceJournalEntryId: string | null;
  title: string;
  content: string;
  occurredOn: string | null;
  occurredOnPrecision: MemoryDatePrecision;
}

export interface UpdateMemoryInput {
  id: string;
  title: string;
  content: string;
  occurredOn: string | null;
  occurredOnPrecision: MemoryDatePrecision;
  expectedRevision: number;
}

export type MemoryLifecycleAction = "trash" | "restore";

export interface MemoryRevisionInput {
  id: string;
  expectedRevision: number;
}

export interface ChangeMemoryStateInput extends MemoryRevisionInput {
  action: MemoryLifecycleAction;
}

export type MemoryDeleteResult =
  | {
      status: "success";
    }
  | MemoryMutationError;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validMemoryId = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

const validRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1;

const validLifecycleAction = (value: unknown): value is MemoryLifecycleAction =>
  value === "trash" || value === "restore";

const failure = (error: unknown): MemoryMutationError => {
  const publicError = toPublicApiError(error);

  return {
    status: "error",
    message: publicError.message,
    kind: publicError.kind,
    ...(error instanceof ApiError && error.code ? { code: error.code } : {}),
    ...(publicError.correlationId
      ? { correlationId: publicError.correlationId }
      : {}),
  };
};

const revalidateMemory = (id: string) => {
  revalidatePath("/memories");
  revalidatePath(`/memories/${id}`);
};

const validPrecision = (value: unknown): value is MemoryDatePrecision =>
  typeof value === "string" &&
  (MEMORY_DATE_PRECISIONS as readonly string[]).includes(value);

const validOccurredOn = (
  value: unknown,
  precision: MemoryDatePrecision,
): boolean => {
  if (precision === "UNKNOWN") {
    return value === null;
  }

  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  if (!isValidMemoryCalendarDate(value)) {
    return false;
  }

  if (precision === "MONTH") {
    return value.endsWith("-01");
  }

  if (precision === "YEAR") {
    return value.endsWith("-01-01");
  }

  return true;
};

export async function createMemory(
  input: CreateMemoryInput,
): Promise<MemoryMutationResult> {
  const title = typeof input.title === "string" ? input.title.trim() : "";

  const content = typeof input.content === "string" ? input.content.trim() : "";

  const sourceJournalEntryId =
    typeof input.sourceJournalEntryId === "string"
      ? input.sourceJournalEntryId.trim()
      : input.sourceJournalEntryId;

  const sourceIsValid =
    sourceJournalEntryId === null ||
    (typeof sourceJournalEntryId === "string" &&
      UUID_PATTERN.test(sourceJournalEntryId));

  if (
    !title ||
    [...title].length > 200 ||
    !content ||
    !sourceIsValid ||
    !validPrecision(input.occurredOnPrecision) ||
    !validOccurredOn(input.occurredOn, input.occurredOnPrecision)
  ) {
    return {
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    };
  }

  try {
    const memory = await apiFetch<MemoryResponse>("/memories", {
      method: "POST",
      body: JSON.stringify({
        sourceJournalEntryId,
        title,
        content,
        occurredOn: input.occurredOn,
        occurredOnPrecision: input.occurredOnPrecision,
      }),
    });

    revalidatePath("/memories");

    return {
      status: "success",
      memory,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateMemory(
  input: UpdateMemoryInput,
): Promise<MemoryMutationResult> {
  const title = typeof input.title === "string" ? input.title.trim() : "";

  const content = typeof input.content === "string" ? input.content.trim() : "";

  if (
    !validMemoryId(input.id) ||
    !title ||
    [...title].length > 200 ||
    !content ||
    !validPrecision(input.occurredOnPrecision) ||
    !validOccurredOn(input.occurredOn, input.occurredOnPrecision) ||
    !validRevision(input.expectedRevision)
  ) {
    return {
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    };
  }

  try {
    const memory = await apiFetch<MemoryResponse>(`/memories/${input.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        content,
        occurredOn: input.occurredOn,
        occurredOnPrecision: input.occurredOnPrecision,
        expectedRevision: input.expectedRevision,
      }),
    });

    revalidateMemory(input.id);

    return {
      status: "success",
      memory,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function reloadMemory(id: string): Promise<MemoryMutationResult> {
  if (!validMemoryId(id)) {
    return {
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    };
  }

  try {
    const memory = await apiFetch<MemoryResponse>(`/memories/${id}`);

    return {
      status: "success",
      memory,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function changeMemoryState(
  input: ChangeMemoryStateInput,
): Promise<MemoryMutationResult> {
  if (
    !validMemoryId(input.id) ||
    !validLifecycleAction(input.action) ||
    !validRevision(input.expectedRevision)
  ) {
    return {
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    };
  }

  try {
    const memory = await apiFetch<MemoryResponse>(
      `/memories/${input.id}/${input.action}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          expectedRevision: input.expectedRevision,
        }),
      },
    );

    revalidateMemory(input.id);

    return {
      status: "success",
      memory,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteMemoryPermanently(
  input: MemoryRevisionInput,
): Promise<MemoryDeleteResult> {
  if (!validMemoryId(input.id) || !validRevision(input.expectedRevision)) {
    return {
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    };
  }

  try {
    await apiFetch<void>(
      `/memories/${input.id}?expectedRevision=${input.expectedRevision}`,
      {
        method: "DELETE",
      },
    );

    revalidatePath("/memories");

    return {
      status: "success",
    };
  } catch (error) {
    return failure(error);
  }
}
