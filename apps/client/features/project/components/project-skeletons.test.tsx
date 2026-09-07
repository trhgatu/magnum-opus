// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ProjectDetailSkeleton,
  ProjectFormSkeleton,
  ProjectListSkeleton,
  ProjectMetaSkeleton,
} from "./project-skeletons";

afterEach(cleanup);

describe("Project skeletons", () => {
  it("announces the Project detail loading state", () => {
    render(<ProjectDetailSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải Project…");
  });

  it("announces the Project form loading state", () => {
    render(<ProjectFormSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang chuẩn bị biểu mẫu Project…",
    );
  });

  it("announces the Project list loading state", () => {
    render(<ProjectListSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải danh sách Project…",
    );
  });

  it("announces the Project meta loading state", () => {
    render(<ProjectMetaSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải thông tin Project…",
    );
  });
});
