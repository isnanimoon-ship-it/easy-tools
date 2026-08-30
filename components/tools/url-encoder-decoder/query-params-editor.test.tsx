import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QueryParamsEditor, type QueryParamsEditorLabels } from "./query-params-editor";

const labels: QueryParamsEditorLabels = {
  inputLabel: "URL or query string",
  inputPlaceholder: "Paste a URL",
  parse: "Parse",
  keyLabel: "Key",
  keyPlaceholder: "key",
  valueLabel: "Value",
  valuePlaceholder: "value",
  removeRow: "Remove row",
  addRow: "Add row",
  tableEmpty: "No parameters yet",
  outputLabel: "Result",
  outputEmpty: "Result appears here",
  copy: "Copy",
  copied: "Copied",
  copyError: "Copy failed",
  clear: "Clear",
};

function installClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
}

afterEach(() => vi.restoreAllMocks());

describe("QueryParamsEditor", () => {
  it("starts empty with Parse and Clear disabled", () => {
    render(<QueryParamsEditor labels={labels} />);
    expect(screen.getByText("No parameters yet")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Parse" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Clear" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("parses a full URL into a base and editable key/value rows", () => {
    render(<QueryParamsEditor labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "URL or query string" }), {
      target: { value: "https://example.com/search?q=hello&page=2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    expect(screen.getAllByPlaceholderText("key").map((el) => (el as HTMLInputElement).value)).toEqual(["q", "page"]);
    expect(screen.getAllByPlaceholderText("value").map((el) => (el as HTMLInputElement).value)).toEqual(["hello", "2"]);
    expect((screen.getByRole("textbox", { name: "Result" }) as HTMLTextAreaElement).value).toBe(
      "https://example.com/search?q=hello&page=2",
    );
  });

  it("updates the reconstructed output live as a row is edited", () => {
    render(<QueryParamsEditor labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "URL or query string" }), { target: { value: "q=hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    fireEvent.change(screen.getAllByPlaceholderText("value")[0], { target: { value: "world" } });
    expect((screen.getByRole("textbox", { name: "Result" }) as HTMLTextAreaElement).value).toBe("q=world");
  });

  it("adds a new blank row that does not affect the output until filled in", () => {
    render(<QueryParamsEditor labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "URL or query string" }), { target: { value: "a=1" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    fireEvent.click(screen.getByRole("button", { name: "Add row" }));
    expect(screen.getAllByPlaceholderText("key")).toHaveLength(2);
    expect((screen.getByRole("textbox", { name: "Result" }) as HTMLTextAreaElement).value).toBe("a=1");

    fireEvent.change(screen.getAllByPlaceholderText("key")[1], { target: { value: "b" } });
    fireEvent.change(screen.getAllByPlaceholderText("value")[1], { target: { value: "2" } });
    expect((screen.getByRole("textbox", { name: "Result" }) as HTMLTextAreaElement).value).toBe("a=1&b=2");
  });

  it("removes a row and updates the output", () => {
    render(<QueryParamsEditor labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "URL or query string" }), { target: { value: "a=1&b=2" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Remove row" })[0]);
    expect(screen.getAllByPlaceholderText("key")).toHaveLength(1);
    expect((screen.getByRole("textbox", { name: "Result" }) as HTMLTextAreaElement).value).toBe("b=2");
  });

  it("clears everything and returns focus to the input", () => {
    render(<QueryParamsEditor labels={labels} />);
    const input = screen.getByRole("textbox", { name: "URL or query string" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "a=1" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(screen.getByText("No parameters yet")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Result" }) as HTMLTextAreaElement).value).toBe("");
  });

  it("copies the exact current output and shows success feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);
    render(<QueryParamsEditor labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "URL or query string" }), { target: { value: "q=hi there" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("q=hi+there"));
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("shows an inline error when copying fails", async () => {
    installClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<QueryParamsEditor labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "URL or query string" }), { target: { value: "a=1" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Copy failed");
  });

  it("re-parsing replaces the previous table instead of appending to it", () => {
    render(<QueryParamsEditor labels={labels} />);
    const input = screen.getByRole("textbox", { name: "URL or query string" });
    fireEvent.change(input, { target: { value: "a=1" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));
    fireEvent.change(input, { target: { value: "b=2&c=3" } });
    fireEvent.click(screen.getByRole("button", { name: "Parse" }));

    expect(screen.getAllByPlaceholderText("key").map((el) => (el as HTMLInputElement).value)).toEqual(["b", "c"]);
  });
});
