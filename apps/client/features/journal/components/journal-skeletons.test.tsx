// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  JournalCollectionSkeleton,
  JournalEditorSkeleton,
} from "./journal-skeletons";

afterEach(cleanup);

describe("Journal skeletons", () => {
  it.each([
    [<JournalCollectionSkeleton key="collection" />, "Đang tải Journal…"],
    [<JournalEditorSkeleton key="editor" />, "Đang mở trang Journal…"],
  ])("announces its loading state", (skeleton, announcement) => {
    render(skeleton);
    expect(screen.getByRole("status")).toHaveTextContent(announcement);
  });
});
