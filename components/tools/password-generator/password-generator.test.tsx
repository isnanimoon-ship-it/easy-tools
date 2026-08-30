import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PasswordGenerator, type PasswordGeneratorLabels } from "./password-generator";

const labels: PasswordGeneratorLabels = {
  modeLabel: "Mode", modeCharacters: "Random characters", modePassphrase: "Passphrase",
  lengthGroup: "Password length", rangeLabel: "Slider", numberLabel: "Exact length", characterTypes: "Types",
  uppercase: "Uppercase", lowercase: "Lowercase", numbers: "Numbers", symbols: "Symbols",
  wordCountGroup: "Word count", wordCountRangeLabel: "Word slider", wordCountNumberLabel: "Exact word count",
  optionsGroup: "Passphrase options", separatorLabel: "Separator",
  separators: { hyphen: "Hyphen", underscore: "Underscore", period: "Period", space: "Space", none: "None" },
  capitalizeLabel: "Capitalize", includeNumberLabel: "Include number",
  generate: "Generate", resultLabel: "Result", emptyResult: "No result", copy: "Copy", copied: "Copied",
  strengthLabel: "Strength", strength: { weak: "Weak", medium: "Medium", strong: "Strong" }, strengthDescription: { weak: "Weak help", medium: "Medium help", strong: "Strong help" }, strengthNotice: "Estimate only",
  allDisabledError: "Select a type", lengthError: "Invalid length", wordCountError: "Invalid word count", randomError: "Random unavailable", copyError: "Copy failed",
};

function checkbox(name: string) { return screen.getByRole("checkbox", { name }) as HTMLInputElement; }
function button(name: string) { return screen.getByRole("button", { name }) as HTMLButtonElement; }
function generatedText() { return screen.getByText((text, element) => element?.tagName === "OUTPUT" && text.length > 0).textContent ?? ""; }

afterEach(() => vi.restoreAllMocks());

describe("PasswordGenerator", () => {
  it("shows the specified initial state and semantic groups", () => {
    render(<PasswordGenerator labels={labels} />);
    expect(screen.getByRole("group", { name: "Password length" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Types" })).toBeTruthy();
    expect((screen.getByRole("slider", { name: "Slider" }) as HTMLInputElement).value).toBe("16");
    expect((screen.getByRole("spinbutton", { name: "Exact length" }) as HTMLInputElement).value).toBe("16");
    for (const name of ["Uppercase", "Lowercase", "Numbers", "Symbols"]) expect(checkbox(name).checked).toBe(true);
    expect(button("Generate").disabled).toBe(false);
    expect(button("Copy").disabled).toBe(true);
  });

  it("synchronizes length controls, normalizes values, and rejects an empty value", () => {
    render(<PasswordGenerator labels={labels} />);
    const slider = screen.getByRole("slider", { name: "Slider" }) as HTMLInputElement;
    const number = screen.getByRole("spinbutton", { name: "Exact length" }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "24" } });
    expect(number.value).toBe("24");
    fireEvent.change(number, { target: { value: "32" } });
    expect(slider.value).toBe("32");
    fireEvent.change(number, { target: { value: "200" } });
    fireEvent.blur(number);
    expect(number.value).toBe("128");
    expect(slider.value).toBe("128");
    fireEvent.change(number, { target: { value: "" } });
    fireEvent.click(button("Generate"));
    expect(screen.getByRole("alert").textContent).toContain("Invalid length");
  });

  it("generates the selected length, shows strength, and clears stale output on setting change", () => {
    render(<PasswordGenerator labels={labels} />);
    fireEvent.click(button("Generate"));
    expect(generatedText()).toHaveLength(16);
    expect(screen.getByText("Strong")).toBeTruthy();
    expect(screen.getByRole("meter", { name: "Strength: Strong" })).toBeTruthy();
    fireEvent.click(checkbox("Symbols"));
    expect(screen.queryByRole("meter")).toBeNull();
    expect(button("Copy").disabled).toBe(true);
  });

  it("handles all character types disabled and recovers immediately", () => {
    render(<PasswordGenerator labels={labels} />);
    for (const name of ["Uppercase", "Lowercase", "Numbers", "Symbols"]) fireEvent.click(checkbox(name));
    expect(screen.getByRole("alert").textContent).toContain("Select a type");
    expect(button("Generate").disabled).toBe(true);
    fireEvent.click(checkbox("Numbers"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(button("Generate").disabled).toBe(false);
  });

  it("copies the exact result and handles clipboard rejection without console errors", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<PasswordGenerator labels={labels} />);
    fireEvent.click(button("Generate"));
    const password = generatedText();
    fireEvent.click(button("Copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(password));
    expect(screen.getByText("Copied").textContent).toBe("Copied");
    writeText.mockRejectedValueOnce(new Error("denied"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fireEvent.click(button("Copy"));
    expect((await screen.findByRole("alert")).textContent).toContain("Copy failed");
    expect(generatedText()).toBe(password);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("shows a friendly error instead of falling back when Web Crypto fails", () => {
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(() => { throw new Error("unavailable"); });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<PasswordGenerator labels={labels} />);
    fireEvent.click(button("Generate"));
    expect(screen.getByRole("alert").textContent).toContain("Random unavailable");
    expect(button("Copy").disabled).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  describe("passphrase mode", () => {
    function switchToPassphrase() {
      render(<PasswordGenerator labels={labels} />);
      fireEvent.click(screen.getByRole("tab", { name: "Passphrase" }));
    }

    it("defaults to 4 words, capitalized, with a number, joined by hyphens", () => {
      switchToPassphrase();
      expect((screen.getByRole("spinbutton", { name: "Exact word count" }) as HTMLInputElement).value).toBe("4");
      fireEvent.click(button("Generate"));
      const words = generatedText().split("-");
      expect(words).toHaveLength(4);
      for (const word of words) expect(/^[A-Z]/.test(word.replace(/\d+$/, ""))).toBe(true);
      expect(/\d/.test(generatedText())).toBe(true);
    });

    it("respects word count, separator, and toggling capitalize/number off", () => {
      switchToPassphrase();
      fireEvent.change(screen.getByRole("spinbutton", { name: "Exact word count" }), { target: { value: "6" } });
      fireEvent.change(screen.getByRole("combobox", { name: "Separator" }), { target: { value: "underscore" } });
      fireEvent.click(checkbox("Capitalize"));
      fireEvent.click(checkbox("Include number"));
      fireEvent.click(button("Generate"));
      const text = generatedText();
      expect(text.split("_")).toHaveLength(6);
      expect(/\d/.test(text)).toBe(false);
      expect(/[A-Z]/.test(text)).toBe(false);
    });

    it("clamps an out-of-range word count on blur and rejects an empty value", () => {
      switchToPassphrase();
      const number = screen.getByRole("spinbutton", { name: "Exact word count" }) as HTMLInputElement;
      fireEvent.change(number, { target: { value: "20" } });
      fireEvent.blur(number);
      expect(number.value).toBe("6");
      fireEvent.change(number, { target: { value: "" } });
      fireEvent.click(button("Generate"));
      expect(screen.getByRole("alert").textContent).toContain("Invalid word count");
    });

    it("shows a strength meter driven by the EFF word list size, not the character pool (4 words ~= 51.7 bits, Medium)", () => {
      switchToPassphrase();
      fireEvent.click(button("Generate"));
      expect(screen.getByText("Medium")).toBeTruthy();
      expect(screen.getByRole("meter", { name: "Strength: Medium" })).toBeTruthy();
    });

    it("clears stale results and switches controls back when returning to character mode", () => {
      switchToPassphrase();
      fireEvent.click(button("Generate"));
      expect(generatedText().length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole("tab", { name: "Random characters" }));
      expect(screen.queryByRole("spinbutton", { name: "Exact word count" })).toBeNull();
      expect(screen.getByRole("spinbutton", { name: "Exact length" })).toBeTruthy();
      expect(button("Copy").disabled).toBe(true);
    });
  });
});
