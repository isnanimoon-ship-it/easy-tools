import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WordCounter, type WordCounterLabels } from "./word-counter";

const labels: WordCounterLabels = {
  inputLabel: "Text",
  inputDescription: "Enter text",
  placeholder: "Type here",
  reset: "Reset",
  resultsLabel: "Results",
  characters: "Characters",
  charactersWithoutWhitespace: "Without spaces",
  words: "Words",
  lines: "Lines",
};

describe("WordCounter", () => {
  it("shows zero metrics and disables reset for empty input", () => {
    render(<WordCounter locale="en" labels={labels} />);

    expect(screen.getByTestId("characters").textContent).toBe("0");
    expect(screen.getByTestId("characters-without-whitespace").textContent).toBe("0");
    expect(screen.getByTestId("words").textContent).toBe("0");
    expect(screen.getByTestId("lines").textContent).toBe("0");
    expect((screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("updates every metric immediately when text changes", () => {
    render(<WordCounter locale="en" labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Text" }), {
      target: { value: "Hello world" },
    });

    expect(screen.getByTestId("characters").textContent).toBe("11");
    expect(screen.getByTestId("characters-without-whitespace").textContent).toBe("10");
    expect(screen.getByTestId("words").textContent).toBe("2");
    expect(screen.getByTestId("lines").textContent).toBe("1");
  });

  it("resets all metrics and returns focus to the textarea", () => {
    render(<WordCounter locale="en" labels={labels} />);
    const input = screen.getByRole("textbox", { name: "Text" }) as HTMLTextAreaElement;
    const reset = screen.getByRole("button", { name: "Reset" });

    fireEvent.change(input, { target: { value: "Hello world" } });
    fireEvent.click(reset);

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(screen.getByTestId("characters").textContent).toBe("0");
    expect((reset as HTMLButtonElement).disabled).toBe(true);
  });
});
