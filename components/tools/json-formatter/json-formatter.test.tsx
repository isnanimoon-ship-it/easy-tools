import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonFormatter, type JsonFormatterLabels } from "./json-formatter";

const labels: JsonFormatterLabels = {
  inputLabel: "JSON editor", inputDescription: "Enter JSON", placeholder: "Paste JSON",
  format: "Format", minify: "Minify", copy: "Copy", clear: "Clear", copied: "Copied",
  invalid: "Invalid JSON", guidance: "Check punctuation", position: "Line {line}, column {column}", copyError: "Copy failed",
};

function button(name: string) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function installClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
}

afterEach(() => vi.restoreAllMocks());

describe("JsonFormatter", () => {
  it("uses the specified initial and whitespace-only button states", () => {
    render(<JsonFormatter labels={labels} />);
    const editor = screen.getByRole("textbox", { name: "JSON editor" });
    for (const name of ["Format", "Minify", "Copy", "Clear"]) expect(button(name).disabled).toBe(true);
    fireEvent.change(editor, { target: { value: " \n\u3000" } });
    for (const name of ["Format", "Minify", "Copy"]) expect(button(name).disabled).toBe(true);
    expect(button("Clear").disabled).toBe(false);
  });

  it("formats and minifies valid JSON in the same editor", () => {
    render(<JsonFormatter labels={labels} />);
    const editor = screen.getByRole("textbox", { name: "JSON editor" }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '{"a":[1,2]}' } });
    fireEvent.click(button("Format"));
    expect(editor.value).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
    fireEvent.click(button("Minify"));
    expect(editor.value).toBe('{"a":[1,2]}');
  });

  it("preserves invalid input, announces a friendly error, and clears it on edit", () => {
    render(<JsonFormatter labels={labels} />);
    const editor = screen.getByRole("textbox", { name: "JSON editor" }) as HTMLTextAreaElement;
    const invalid = '{"a":}';
    fireEvent.change(editor, { target: { value: invalid } });
    fireEvent.click(button("Format"));
    expect(editor.value).toBe(invalid);
    expect(screen.getByRole("alert").textContent).toContain("Invalid JSON");
    expect(editor.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(editor, { target: { value: '{}' } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("copies the exact current text and announces success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);
    render(<JsonFormatter labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "JSON editor" }), { target: { value: '{ "a": 1 }' } });
    fireEvent.click(button("Copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('{ "a": 1 }'));
    expect(screen.getByRole("status").textContent).toBe("Copied");
  });

  it("handles clipboard rejection without changing input or logging an error", async () => {
    installClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<JsonFormatter labels={labels} />);
    const editor = screen.getByRole("textbox", { name: "JSON editor" }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "null" } });
    fireEvent.click(button("Copy"));
    expect((await screen.findByRole("alert")).textContent).toContain("Copy failed");
    expect(editor.value).toBe("null");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("clears all state and returns focus to the editor", () => {
    render(<JsonFormatter labels={labels} />);
    const editor = screen.getByRole("textbox", { name: "JSON editor" }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '{"a":}' } });
    fireEvent.click(button("Format"));
    fireEvent.click(button("Clear"));
    expect(editor.value).toBe("");
    expect(document.activeElement).toBe(editor);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
