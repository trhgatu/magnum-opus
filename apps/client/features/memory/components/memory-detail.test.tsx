// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { MemoryResponse } from "@repo/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/memory/components/memory-lifecycle-controls", () => ({
  MemoryLifecycleControls: () => null,
}));

import { MemoryDetail } from "./memory-detail";

const memory: MemoryResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  sourceJournalEntryId: "cc2a5d7a-72ba-41ce-9ad8-c82941270f35",
  title: "Buổi chiều bên cửa sổ",
  content: "Ánh nắng nằm yên trên mặt bàn.",
  occurredOn: "2024-08-01",
  occurredOnPrecision: "MONTH",
  state: "ACTIVE",
  revision: 2,
  trashedAt: null,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T11:00:00.000Z",
};

afterEach(cleanup);

describe("MemoryDetail", () => {
  it("renders the Memory and preserves date precision", () => {
    render(<MemoryDetail memory={memory} />);

    expect(
      screen.getByRole("heading", {
        name: "Buổi chiều bên cửa sổ",
      }),
    ).toBeTruthy();

    expect(screen.getByText("Tháng 8, 2024")).toBeTruthy();

    expect(screen.getByText("Ánh nắng nằm yên trên mặt bàn.")).toBeTruthy();
  });

  it("links to the source Journal entry", () => {
    render(<MemoryDetail memory={memory} />);

    expect(
      screen
        .getByRole("link", {
          name: "Mở Nhật ký nguồn",
        })
        .getAttribute("href"),
    ).toBe("/journal/cc2a5d7a-72ba-41ce-9ad8-c82941270f35");
  });

  it("links an active Memory to its edit page", () => {
    render(<MemoryDetail memory={memory} />);

    expect(
      screen
        .getByRole("link", {
          name: "Chỉnh sửa",
        })
        .getAttribute("href"),
    ).toBe(`/memories/${memory.id}/edit`);
  });

  it("marks a trashed Memory", () => {
    render(
      <MemoryDetail
        memory={{
          ...memory,
          state: "TRASHED",
          trashedAt: "2026-08-15T10:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Thùng rác")).toBeTruthy();

    expect(
      screen.queryByRole("link", {
        name: "Chỉnh sửa",
      }),
    ).toBeNull();
  });
});
