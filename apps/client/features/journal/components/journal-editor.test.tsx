// @vitest-environment jsdom

import type { JournalEntryResponse } from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateJournalEntry,
  changeJournalEntryState,
  deleteJournalEntryPermanently,
  reloadJournalEntry,
  push,
  refresh,
  notifySuccess,
} = vi.hoisted(() => ({
  updateJournalEntry: vi.fn(),
  changeJournalEntryState: vi.fn(),
  deleteJournalEntryPermanently: vi.fn(),
  reloadJournalEntry: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/journal/actions/journal", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/journal/actions/journal")>();

  return {
    ...actual,
    updateJournalEntry,
    changeJournalEntryState,
    deleteJournalEntryPermanently,
    reloadJournalEntry,
  };
});

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { JournalEditor } from "./journal-editor";

const draftEntry: JournalEntryResponse = {
  id: "36cbf877-1462-42bd-b18a-42577960784a",
  title: "Buổi sáng tĩnh lặng",
  content: "Một suy nghĩ đáng giữ lại.",
  state: "DRAFT",
  stateBeforeTrash: null,
  revision: 2,
  trashedAt: null,
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:01:00.000Z",
};

const sealedEntry: JournalEntryResponse = {
  ...draftEntry,
  state: "SEALED",
};

const trashedEntry: JournalEntryResponse = {
  ...draftEntry,
  state: "TRASHED",
  stateBeforeTrash: "DRAFT",
  trashedAt: "2026-08-09T01:00:00.000Z",
};

const redirectError = (url: string) =>
  Object.assign(new Error("NEXT_REDIRECT"), {
    digest: `NEXT_REDIRECT;replace;${url};307;`,
  });

const renderEditor = (entry: JournalEntryResponse) =>
  render(
    <JournalEditor
      initialEntry={entry}
      initialMood={null}
      linkedMemories={[]}
      linkedMemoriesTotal={0}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("JournalEditor", () => {
  it("seals a draft entry and notifies success", async () => {
    changeJournalEntryState.mockResolvedValue({
      status: "success",
      entry: { ...draftEntry, state: "SEALED", revision: 3 },
    });

    renderEditor(draftEntry);

    fireEvent.click(screen.getByRole("button", { name: "Niêm phong" }));

    await waitFor(() =>
      expect(changeJournalEntryState).toHaveBeenCalledWith({
        id: draftEntry.id,
        action: "seal",
        expectedRevision: draftEntry.revision,
      }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        `Đã niêm phong "${draftEntry.title}"`,
      ),
    );

    expect(await screen.findByRole("button", { name: "Mở lại" })).toBeTruthy();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("reopens a sealed entry and notifies success", async () => {
    changeJournalEntryState.mockResolvedValue({
      status: "success",
      entry: { ...sealedEntry, state: "DRAFT", revision: 3 },
    });

    renderEditor(sealedEntry);

    fireEvent.click(screen.getByRole("button", { name: "Mở lại" }));

    await waitFor(() =>
      expect(changeJournalEntryState).toHaveBeenCalledWith({
        id: sealedEntry.id,
        action: "reopen",
        expectedRevision: sealedEntry.revision,
      }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        `Đã mở lại "${sealedEntry.title}"`,
      ),
    );
  });

  it("moves an entry to Trash and notifies success", async () => {
    changeJournalEntryState.mockResolvedValue({
      status: "success",
      entry: { ...draftEntry, state: "TRASHED", revision: 3 },
    });

    renderEditor(draftEntry);

    fireEvent.click(screen.getByRole("button", { name: "Đưa vào Thùng rác" }));

    await waitFor(() =>
      expect(changeJournalEntryState).toHaveBeenCalledWith({
        id: draftEntry.id,
        action: "trash",
        expectedRevision: draftEntry.revision,
      }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        `Đã đưa "${draftEntry.title}" vào Thùng rác`,
      ),
    );
  });

  it("restores a trashed entry and notifies success", async () => {
    changeJournalEntryState.mockResolvedValue({
      status: "success",
      entry: {
        ...trashedEntry,
        state: "DRAFT",
        stateBeforeTrash: null,
        revision: 3,
      },
    });

    renderEditor(trashedEntry);

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục" }));

    await waitFor(() =>
      expect(changeJournalEntryState).toHaveBeenCalledWith({
        id: trashedEntry.id,
        action: "restore",
        expectedRevision: trashedEntry.revision,
      }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        `Đã khôi phục "${trashedEntry.title}"`,
      ),
    );
  });

  it("shows the server message without notifying success when a lifecycle action fails", async () => {
    changeJournalEntryState.mockResolvedValue({
      status: "error",
      message: "Không thể niêm phong entry lúc này.",
    });

    renderEditor(draftEntry);

    fireEvent.click(screen.getByRole("button", { name: "Niêm phong" }));

    expect(
      await screen.findByText("Không thể niêm phong entry lúc này."),
    ).toBeTruthy();

    expect(notifySuccess).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("notifies success and re-throws the NEXT_REDIRECT signal when permanently deleting", async () => {
    const redirectRejection = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.off("unhandledRejection", handler);
        reject(
          new Error(
            "Expected an unhandled NEXT_REDIRECT rejection, but none occurred",
          ),
        );
      }, 1000);

      const handler = (reason: unknown) => {
        const digest =
          typeof reason === "object" && reason !== null && "digest" in reason
            ? (reason as { digest?: unknown }).digest
            : undefined;

        if (
          typeof digest !== "string" ||
          !digest.startsWith("NEXT_REDIRECT;")
        ) {
          return;
        }

        clearTimeout(timeout);
        process.off("unhandledRejection", handler);
        resolve();
      };

      process.on("unhandledRejection", handler);
    });

    deleteJournalEntryPermanently.mockRejectedValue(
      redirectError("/journal?state=TRASHED"),
    );

    renderEditor(trashedEntry);

    fireEvent.click(screen.getByRole("button", { name: "Xóa vĩnh viễn" }));

    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Xóa vĩnh viễn" }),
    );

    await waitFor(() =>
      expect(deleteJournalEntryPermanently).toHaveBeenCalledWith({
        id: trashedEntry.id,
        expectedRevision: trashedEntry.revision,
      }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        `Đã xóa vĩnh viễn "${trashedEntry.title}"`,
      ),
    );

    await redirectRejection;
  });

  it("navigates to memory creation with the source entry id", async () => {
    renderEditor(draftEntry);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Giữ lại như ký ức" })[0],
    );

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        `/memories/new?sourceJournalEntryId=${draftEntry.id}`,
      ),
    );
  });

  it("offers to reload when autosave hits a revision conflict, using Journal's own wording", async () => {
    updateJournalEntry.mockResolvedValue({
      status: "error",
      code: "JOURNAL_ENTRY_REVISION_CONFLICT",
      message: "Entry đã thay đổi ở nơi khác.",
    });
    reloadJournalEntry.mockResolvedValue({
      status: "success",
      entry: { ...draftEntry, content: "Bản mới nhất từ server.", revision: 3 },
    });

    renderEditor(draftEntry);

    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: { value: "Nội dung đang gõ dở." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lưu ngay" }));

    expect(
      await screen.findByRole("heading", {
        name: "Entry đã được thay đổi ở nơi khác",
      }),
    ).toBeTruthy();

    // Đây chính là nhãn nút Journal đã bị mất khi ConflictAlert được gộp
    // dùng chung với Memory — giữ test này để bug đó không tái diễn.
    const useLatestButton = screen.getByRole("button", {
      name: "Dùng bản mới nhất",
    });
    expect(
      screen.getByRole("button", { name: "Ghi nội dung đang gõ" }),
    ).toBeTruthy();

    await waitFor(() =>
      expect((useLatestButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(useLatestButton);

    await waitFor(() =>
      expect(reloadJournalEntry).toHaveBeenCalledWith(draftEntry.id),
    );

    expect(
      (screen.getByLabelText("Nội dung") as HTMLTextAreaElement).value,
    ).toBe("Bản mới nhất từ server.");
  });
});
