// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MoodDistributionBar } from "./mood-distribution-bar";

afterEach(cleanup);

function segmentColorOf(label: RegExp): string | undefined {
  const dot = screen.getByText(label).previousElementSibling;

  return dot?.className.split(" ").find((name) => name.startsWith("bg-"));
}

describe("MoodDistributionBar", () => {
  it("keeps a mood's color when other moods are missing", () => {
    render(<MoodDistributionBar distribution={{ JOYFUL: 2, CALM: 4 }} />);
    const colorWithJoyful = segmentColorOf(/Bình yên/);
    cleanup();

    render(<MoodDistributionBar distribution={{ CALM: 4 }} />);

    expect(segmentColorOf(/Bình yên/)).toBe(colorWithJoyful);
  });

  it("renders nothing for an empty distribution", () => {
    const { container } = render(<MoodDistributionBar distribution={{}} />);

    expect(container).toBeEmptyDOMElement();
  });
});
