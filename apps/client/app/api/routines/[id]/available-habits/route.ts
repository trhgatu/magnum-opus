import { NextResponse } from "next/server";

import { getAvailableRoutineHabits } from "@/features/routine/api/routine";
import { ApiError, toPublicApiError } from "@/lib/api";

const parsePositiveInteger = (
  rawValue: string | null,
  fallback: number,
  maximum?: number,
): number | null => {
  if (rawValue === null) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value < 1) {
    return null;
  }

  if (maximum !== undefined && value > maximum) {
    return null;
  }

  return value;
};

const validationResponse = () =>
  NextResponse.json(
    {
      kind: "validation",
      message: "Tham số tìm kiếm Habit không hợp lệ.",
    },
    {
      status: 400,
    },
  );

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await context.params;
  const searchParams = new URL(request.url).searchParams;

  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const limit = parsePositiveInteger(searchParams.get("limit"), 20, 50);
  const search = searchParams.get("search")?.trim();

  if (
    page === null ||
    limit === null ||
    (search !== undefined && search.length > 200)
  ) {
    return validationResponse();
  }

  try {
    const result = await getAvailableRoutineHabits(id, {
      page,
      limit,
      ...(search ? { search } : {}),
    });
    return NextResponse.json(result);
  } catch (error) {
    const publicError = toPublicApiError(
      error,
      "Không thể tải danh sách Habit.",
    );

    const status =
      error instanceof ApiError && error.status !== null ? error.status : 500;

    return NextResponse.json(publicError, {
      status,
    });
  }
}
