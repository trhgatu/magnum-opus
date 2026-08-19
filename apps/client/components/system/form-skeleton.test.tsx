// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FormSkeleton } from "./form-skeleton";

afterEach(cleanup);

describe("FormSkeleton", () => {
  it("renders the real page heading while the form fields stay placeholders", () => {
    render(
      <FormSkeleton
        eyebrow="Reflection"
        title="Lưu một ký ức"
        description="Giữ lại một khoảnh khắc theo cách nó được nhớ."
      />,
    );

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(
      screen.getByRole("heading", { name: "Lưu một ký ức" }),
    ).not.toBeNull();
  });
});
