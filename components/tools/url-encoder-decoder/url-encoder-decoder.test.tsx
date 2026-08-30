import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UrlEncoderDecoder, type UrlEncoderDecoderLabels } from "./url-encoder-decoder";

const labels: UrlEncoderDecoderLabels = {
  viewModeLabel: "View mode", viewText: "Text conversion", viewQuery: "Query string editor",
  modeLabel: "Mode", encodeMode: "Encode mode", decodeMode: "Decode mode",
  typeLabel: "Encoding type", componentType: "URL Component", fullUrlType: "Full URL",
  componentHelp: "Encodes reserved characters.", fullUrlHelp: "Keeps URL structure.", plusHelp: "Plus stays plus.",
  inputEncode: "Text or URL input", inputDecode: "Encoded URL input", inputPlaceholderEncode: "Enter text", inputPlaceholderDecode: "Enter encoded text",
  resultEncode: "Encoded result", resultDecode: "Decoded result", resultEmpty: "Result appears here",
  encode: "Encode", decode: "Decode", clear: "Clear", copy: "Copy result", copied: "Copied",
  operations: { "encode-component": "UTF-8 component encoding", "encode-full-url": "UTF-8 full URL encoding", "decode-component": "UTF-8 component decoding", "decode-full-url": "UTF-8 full URL decoding" },
  errors: { "invalid-percent-encoding": "Invalid URL encoding", "invalid-unicode": "Invalid Unicode", copy: "Copy failed" },
  query: {
    inputLabel: "URL or query string", inputPlaceholder: "Paste a URL", parse: "Parse",
    keyLabel: "Key", keyPlaceholder: "key", valueLabel: "Value", valuePlaceholder: "value",
    removeRow: "Remove row", addRow: "Add row", tableEmpty: "No parameters yet",
    outputLabel: "Result", outputEmpty: "Result appears here", copy: "Copy", copied: "Copied",
    copyError: "Copy failed", clear: "Clear",
  },
};

afterEach(() => vi.restoreAllMocks());
const result = () => screen.getByRole("textbox", { name: /result/i }) as HTMLTextAreaElement;

describe("UrlEncoderDecoder", () => {
  it("starts in Encode and URL Component with an empty non-error state", () => {
    render(<UrlEncoderDecoder labels={labels} />);
    expect(screen.getByRole("button", { name: "Encode mode" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "URL Component" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Encode" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("encodes whitespace and Unicode without treating them as empty", () => {
    render(<UrlEncoderDecoder labels={labels} />);
    const input = screen.getByRole("textbox", { name: "Text or URL input" });
    fireEvent.change(input, { target: { value: " 안녕😀\n" } });
    fireEvent.click(screen.getByRole("button", { name: "Encode" }));
    expect(result().value).toBe("%20%EC%95%88%EB%85%95%F0%9F%98%80%0A");
    expect(screen.getByText("UTF-8 component encoding")).toBeTruthy();
  });

  it("preserves URL structure in Full URL and clears stale output on selection changes", () => {
    render(<UrlEncoderDecoder labels={labels} />);
    const input = screen.getByRole("textbox", { name: "Text or URL input" }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "https://example.com/?q=안녕&sort=new" } });
    fireEvent.click(screen.getByRole("button", { name: "Full URL" }));
    fireEvent.click(screen.getByRole("button", { name: "Encode" }));
    expect(result().value).toContain("https://example.com/?q=");
    fireEvent.click(screen.getByRole("button", { name: "Decode mode" }));
    expect(input.value).toContain("https://");
    expect(result().value).toBe("");
  });

  it("shows a friendly malformed Percent error and clears feedback on edit", () => {
    render(<UrlEncoderDecoder labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Decode mode" }));
    const input = screen.getByRole("textbox", { name: "Encoded URL input" });
    fireEvent.change(input, { target: { value: "%ZZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    expect(screen.getByRole("alert").textContent).toBe("Invalid URL encoding");
    fireEvent.change(input, { target: { value: "%20" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps plus literal in Decode", () => {
    render(<UrlEncoderDecoder labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Decode mode" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Encoded URL input" }), { target: { value: "a+b%20c" } });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    expect(result().value).toBe("a+b c");
  });

  it("clears all data, preserves choices, and focuses input", () => {
    render(<UrlEncoderDecoder labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Full URL" }));
    const input = screen.getByRole("textbox", { name: "Text or URL input" }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Encode" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input.value).toBe("");
    expect(result().value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole("button", { name: "Full URL" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("copies exactly and handles Clipboard rejection without losing the result", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<UrlEncoderDecoder labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Text or URL input" }), { target: { value: "a b" } });
    fireEvent.click(screen.getByRole("button", { name: "Encode" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy result" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("a%20b"));
    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Copy result" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Copy failed");
    expect(result().value).toBe("a%20b");
  });
});
