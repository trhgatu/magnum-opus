// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { MoodResponse } from "@repo/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh, removeMood, setMood } = vi.hoisted(() => ({
  refresh: vi.fn(),
  removeMood: vi.fn(),
  setMood: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("@/features/mood/actions/mood", () => ({ removeMood, setMood }));

import { MoodPanel } from "./mood-panel";

const mood: MoodResponse = {
  id: "7ed07de6-dda8-4ab9-a21c-900a4d75ddaf",
  journalEntryId: "36cbf877-1462-42bd-b18a-42577960784a",
  label: "CALM",
  intensity: 3,
  note: "Quiet after the rain",
  revision: 1,
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:01:00.000Z",
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("MoodPanel", () => {
  it("creates a Mood from an editable Journal draft", async () => {
    setMood.mockResolvedValue({ status: "success", mood });

    render(
      <MoodPanel
        journalEntryId={mood.journalEntryId}
        initialMood={null}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thêm tâm trạng" }));
    fireEvent.click(screen.getByRole("button", { name: "Bình yên" }));
    fireEvent.click(screen.getByRole("button", { name: "Cường độ 3" }));
    fireEvent.change(screen.getByLabelText("Ghi chú ngắn"), {
      target: { value: "Quiet after the rain" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu tâm trạng" }));

    await waitFor(() =>
      expect(setMood).toHaveBeenCalledWith({
        journalEntryId: mood.journalEntryId,
        label: "CALM",
        intensity: 3,
        note: "Quiet after the rain",
      }),
    );
    expect(await screen.findByText("Đã lưu tâm trạng.")).toBeTruthy();
    expect(screen.getByText("Cường độ 3/5")).toBeTruthy();
  });

  it("offers a refresh instead of overwriting a concurrent change", async () => {
    setMood.mockResolvedValue({
      status: "error",
      code: "MOOD_REVISION_CONFLICT",
      message: "Dữ liệu đã thay đổi hoặc đang xung đột.",
    });

    render(
      <MoodPanel
        journalEntryId={mood.journalEntryId}
        initialMood={mood}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thay đổi" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu tâm trạng" }));

    expect(
      await screen.findByText("Tâm trạng đã thay đổi ở nơi khác"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới nhất" }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps Mood read-only when the Journal entry is sealed", () => {
    render(
      <MoodPanel
        journalEntryId={mood.journalEntryId}
        initialMood={mood}
        editable={false}
      />,
    );

    expect(screen.getByText("Bình yên")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thay đổi" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Loại bỏ tâm trạng" }),
    ).toBeNull();
  });
});
