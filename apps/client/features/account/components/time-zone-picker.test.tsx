// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TimeZonePicker } from "./time-zone-picker";

afterEach(cleanup);

const renderPicker = (value = "UTC") => {
  const onValueChange = vi.fn();
  render(
    <>
      <span id="tz-label">Múi giờ</span>
      <TimeZonePicker
        value={value}
        onValueChange={onValueChange}
        labelId="tz-label"
      />
    </>,
  );
  return { onValueChange };
};

const open = () =>
  fireEvent.click(screen.getByRole("combobox", { name: "Múi giờ" }));

const search = (query: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm múi giờ" }), {
    target: { value: query },
  });

describe("TimeZonePicker", () => {
  it("shows the current zone with its offset on the trigger", () => {
    renderPicker("Asia/Ho_Chi_Minh");

    expect(
      screen.getByRole("combobox", { name: "Múi giờ" }).textContent,
    ).toContain("Asia/Ho_Chi_Minh (GMT+07:00)");
  });

  it("marks the current zone as selected in the list", () => {
    renderPicker("Europe/London");
    open();

    expect(
      screen
        .getByRole("option", { name: /Europe\/London/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("narrows the list as the user types and picks a zone", () => {
    const { onValueChange } = renderPicker();
    open();
    search("tokyo");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: /Asia\/Tokyo/ }));

    expect(onValueChange).toHaveBeenCalledWith("Asia/Tokyo");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("finds Vietnam by its common name", () => {
    renderPicker();
    open();
    search("ho chi minh");

    expect(screen.getByRole("option", { name: /GMT\+07:00/ })).toBeTruthy();
  });

  it("says so when nothing matches", () => {
    renderPicker();
    open();
    search("atlantis");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Không tìm thấy múi giờ phù hợp.")).toBeTruthy();
  });

  it("cannot be opened while disabled", () => {
    render(<TimeZonePicker value="UTC" onValueChange={vi.fn()} disabled />);

    expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
  });
});
