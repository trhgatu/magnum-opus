// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  RoutineCollectionSkeleton,
  RoutineDetailSkeleton,
  RoutineFormSkeleton,
  RoutineListSkeleton,
} from "./routine-skeletons";

afterEach(cleanup);

describe("Routine skeletons", () => {
  it("announces the Routine collection loading state", () => {
    render(<RoutineCollectionSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải danh sách Nếp sinh hoạt…",
    );
  });

  it("announces the Routine detail loading state", () => {
    render(<RoutineDetailSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải Nếp sinh hoạt…",
    );
  });

  it("announces the Routine form loading state", () => {
    render(<RoutineFormSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang chuẩn bị biểu mẫu Nếp sinh hoạt…",
    );
  });

  it("announces the Routine list loading state", () => {
    render(<RoutineListSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải danh sách Nếp sinh hoạt…",
    );
  });
});
