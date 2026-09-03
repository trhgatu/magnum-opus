// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  MemoryCollectionSkeleton,
  MemoryDetailSkeleton,
  MemoryFormSkeleton,
  MemoryListSkeleton,
  MemoryMetaSkeleton,
} from "./memory-skeletons";

afterEach(cleanup);

describe("Memory skeletons", () => {
  it.each([
    [<MemoryCollectionSkeleton key="collection" />, "Đang tải ký ức…"],
    [<MemoryDetailSkeleton key="detail" />, "Đang mở ký ức…"],
    [<MemoryFormSkeleton key="form" />, "Đang chuẩn bị biểu mẫu ký ức…"],
    [<MemoryListSkeleton key="list" />, "Đang tải ký ức…"],
    [<MemoryMetaSkeleton key="meta" />, "Đang tải thông tin ký ức…"],
  ])("announces its loading state", (skeleton, announcement) => {
    render(skeleton);
    expect(screen.getByRole("status")).toHaveTextContent(announcement);
  });
});
