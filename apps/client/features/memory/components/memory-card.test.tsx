// @vitest-environment jsdom

import type { MemoryResponse } from "@repo/contracts";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MemoryCard } from "./memory-card";

const memory: MemoryResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  sourceJournalEntryId: "cc2a5d7a-72ba-41ce-9ad8-c82941270f35",
  title: "Buổi chiều bên cửa sổ",
  content: "Ánh nắng nằm yên trên mặt bàn và căn phòng rất tĩnh.",
  occurredOn: "2024-08-01",
  occurredOnPrecision: "MONTH",
  state: "ACTIVE",
  revision: 1,
  trashedAt: null,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T10:00:00.000Z",
};

afterEach(cleanup);

describe("MemoryCard", () => {
  it("links to the detail page and preserves date precision", () => {
    render(<MemoryCard memory={memory} />);

    const link = screen.getByRole("link", {
      name: "Mở ký ức: Buổi chiều bên cửa sổ",
    });

    expect(link.getAttribute("href")).toBe(`/memories/${memory.id}`);

    const occurredOn = screen.getByText("Tháng 8, 2024");

    expect(occurredOn.tagName).toBe("TIME");
    expect(occurredOn.getAttribute("datetime")).toBe("2024-08");
    expect(screen.getByText("Từ Journal")).toBeTruthy();
  });

  it("renders unknown time without inventing a date", () => {
    render(
      <MemoryCard
        memory={{
          ...memory,
          sourceJournalEntryId: null,
          occurredOn: null,
          occurredOnPrecision: "UNKNOWN",
        }}
      />,
    );

    const unknownTime = screen.getByText("Không rõ thời gian");

    expect(unknownTime.tagName).toBe("SPAN");
    expect(screen.queryByText("Từ Journal")).toBeNull();
  });

  it("marks a trashed Memory", () => {
    render(
      <MemoryCard
        memory={{
          ...memory,
          state: "TRASHED",
          trashedAt: "2026-08-14T11:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Trash")).toBeTruthy();
  });
});
