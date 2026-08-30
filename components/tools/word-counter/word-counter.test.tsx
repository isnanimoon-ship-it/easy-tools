import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  readingTimeMinutes: "About __MINUTES__ min read",
  readingTimeSeconds: "About __SECONDS__ sec read",
  copyResults: "Copy results",
  copied: "Copied",
  copyError: "Could not copy the results.",
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

  it("hides reading time and disables copy for empty input", () => {
    render(<WordCounter locale="en" labels={labels} />);

    expect(screen.queryByTestId("reading-time")).toBeNull();
    expect((screen.getByRole("button", { name: "Copy results" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows reading time in seconds for short text", () => {
    render(<WordCounter locale="en" labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Text" }), {
      target: { value: "one two three four five six seven eight nine ten" },
    });

    expect(screen.getByTestId("reading-time").textContent).toContain("About 3 sec read");
  });

  it("shows reading time in minutes once text crosses the one-minute threshold", () => {
    render(<WordCounter locale="en" labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Text" }), {
      target: { value: Array.from({ length: 200 }, () => "word").join(" ") },
    });

    expect(screen.getByTestId("reading-time").textContent).toContain("About 1 min read");
  });

  it("copies every metric and the reading time as text, then reverts the button label", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<WordCounter locale="en" labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Text" }), {
      target: { value: "Hello world" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy results" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "Characters: 11\nWithout spaces: 10\nWords: 2\nLines: 1\nAbout 1 sec read",
      ),
    );
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();

    vi.advanceTimersByTime(1600);
    expect(await screen.findByRole("button", { name: "Copy results" })).toBeTruthy();
    vi.useRealTimers();
  });

  it("shows an inline error when the clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<WordCounter locale="en" labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Text" }), {
      target: { value: "Hello world" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy results" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Could not copy the results.");
  });
});
