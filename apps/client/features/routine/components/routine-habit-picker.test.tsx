// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RoutineHabitPicker } from "./routine-habit-picker";

const fetchMock = vi.fn();

const optionsResponse = {
  data: [
    {
      id: "a64413f3-1487-4500-8753-0795c3f973af",
      title: "Drink water",
    },
  ],
  meta: {
    totalItems: 1,
    itemCount: 1,
    itemsPerPage: 20,
    totalPages: 1,
    currentPage: 1,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => optionsResponse,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RoutineHabitPicker", () => {
  it("loads minimal Habit options and selects one", async () => {
    const onValueChange = vi.fn();

    render(
      <RoutineHabitPicker
        routineId="routine-id"
        revision={3}
        value=""
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", { name: "Chọn Thói quen đang hoạt động" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/routines/routine-id/available-habits?page=1&limit=20",
        expect.objectContaining({
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
      ),
    );

    const option = await screen.findByRole("option", {
      name: "Drink water",
    });
    fireEvent.click(option);

    expect(onValueChange).toHaveBeenCalledWith(
      "a64413f3-1487-4500-8753-0795c3f973af",
    );
  });

  it("debounces and normalizes a search query", async () => {
    render(
      <RoutineHabitPicker
        routineId="routine-id"
        revision={3}
        value=""
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", { name: "Chọn Thói quen đang hoạt động" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(
      await screen.findByRole("textbox", { name: "Tìm Thói quen theo tên" }),
      {
        target: { value: "  water  " },
      },
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/routines/routine-id/available-habits?page=1&limit=20&search=water",
    );
  });

  it("shows a safe retry message when loading fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    render(
      <RoutineHabitPicker
        routineId="routine-id"
        revision={3}
        value=""
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", { name: "Chọn Thói quen đang hoạt động" }),
    );

    expect(
      await screen.findByText(
        "Không thể tải danh sách Thói quen. Thử đóng và mở lại.",
      ),
    ).toBeInTheDocument();
  });
});
