// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  JournalCollectionSkeleton,
  JournalEditorSkeleton,
  JournalListSkeleton,
  JournalMetaSkeleton,
} from "./journal-skeletons";

afterEach(cleanup);

describe("Journal skeletons", () => {
  it.each([
    [<JournalCollectionSkeleton key="collection" />, "Đang tải Nhật ký…"],
    [<JournalEditorSkeleton key="editor" />, "Đang mở trang Nhật ký…"],
    [<JournalListSkeleton key="list" />, "Đang tải Nhật ký…"],
    [<JournalMetaSkeleton key="meta" />, "Đang tải thông tin Nhật ký…"],
  ])("announces its loading state", (skeleton, announcement) => {
    render(skeleton);
    expect(screen.getByRole("status")).toHaveTextContent(announcement);
  });
});
