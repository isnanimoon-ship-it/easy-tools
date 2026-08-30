import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QrCodeGenerator, type QrCodeGeneratorLabels, type QrRenderer } from "./qr-code-generator";

const labels: QrCodeGeneratorLabels = {
  inputLabel: "Content", inputHelp: "Enter text", placeholder: "Text", previewTitle: "Preview", empty: "No QR", processing: "Generating", canvasLabel: "Generated QR",
  optionsTitle: "Options", sizeLabel: "Size", sizeHelp: "Pixel size", levelLabel: "Correction", levelHelp: "Recovery", marginLabel: "Quiet Zone", marginHelp: "Margin",
  levels: { L: "L - Low", M: "M - Medium", Q: "Q - High", H: "H - Very high" }, margins: { 4: "4 modules", 6: "6 modules", 8: "8 modules" },
  currentSize: "Size", currentLevel: "Level", currentMargin: "Margin", inputType: "Type", inputTypes: { text: "Text", url: "URL" }, effectiveLevel: "Applied level",
  download: "Download PNG", copyInput: "Copy input", clear: "Clear", downloaded: "Downloaded", copied: "Copied", densityWarning: "Hard to scan",
  errors: { "capacity-exceeded": "Too long", "size-too-small": "Choose larger", "generation-failed": "Failed", "download-failed": "Download failed", "copy-failed": "Copy failed" },
  sourceTypeLabel: "Source type",
  sourceTypes: { text: "Text or URL", wifi: "Wi-Fi", contact: "Contact", email: "Email", phone: "Phone", sms: "SMS", location: "Location" },
  payloadPreviewLabel: "Generated content",
  wifi: { ssid: "Network name (SSID)", ssidPlaceholder: "MyWiFi", password: "Password", security: "Security", securityOptions: { WPA: "WPA/WPA2", WEP: "WEP", nopass: "None" }, hidden: "Hidden network" },
  contact: { firstName: "First name", lastName: "Last name", phone: "Phone", email: "Email" },
  email: { address: "Email address", subject: "Subject", body: "Body" },
  phone: { number: "Phone number" },
  sms: { number: "Phone number", message: "Message" },
  location: { latitude: "Latitude", longitude: "Longitude" },
  logo: { title: "Center logo", upload: "Upload logo", remove: "Remove logo", help: "Adds a logo to the center of the QR code.", boosted: "Error correction raised to keep the code scannable.", errors: { "unsupported-type": "Choose an image file.", "file-too-large": "Image is too large." } },
};
const okRenderer: QrRenderer = vi.fn(async (canvas, input, options) => { canvas.width = options.size; canvas.height = options.size; return { ok: true as const, metadata: { version: input.length > 900 ? 25 : 1, moduleCount: 21, modulePixels: 8, warning: input.length > 900, effectiveLevel: options.level } }; });

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("QrCodeGenerator", () => {
  it("keeps empty input neutral and generates automatically after 250ms", async () => {
    vi.useFakeTimers(); render(<QrCodeGenerator labels={labels} renderer={okRenderer} />);
    expect((screen.getByRole("button", { name: "Download PNG" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Content" }), { target: { value: "Hello World" } });
    await act(async () => vi.advanceTimersByTime(249)); expect(okRenderer).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1)); expect(okRenderer).toHaveBeenCalledTimes(1);
    expect(screen.getByText("256 × 256px")).toBeTruthy(); expect(screen.getByText("Text")).toBeTruthy();
  });

  it("preserves whitespace and regenerates immediately for every option", async () => {
    vi.useFakeTimers(); render(<QrCodeGenerator labels={labels} renderer={okRenderer} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  line\n" } }); await act(async () => vi.advanceTimersByTime(250));
    fireEvent.change(screen.getByRole("combobox", { name: /Size/ }), { target: { value: "512" } }); await act(async () => Promise.resolve());
    fireEvent.change(screen.getByRole("combobox", { name: /Correction/ }), { target: { value: "H" } }); await act(async () => Promise.resolve());
    fireEvent.change(screen.getByRole("combobox", { name: /Quiet Zone/ }), { target: { value: "8" } }); await act(async () => Promise.resolve());
    expect(okRenderer).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), "  line\n", { size: 512, level: "H", margin: 8 });
  });

  it("shows normalized generation errors and recovers", async () => {
    vi.useFakeTimers(); const renderer: QrRenderer = vi.fn(async () => ({ ok: false as const, reason: "capacity-exceeded" as const }));
    render(<QrCodeGenerator labels={labels} renderer={renderer} />); fireEvent.change(screen.getByRole("textbox"), { target: { value: "long" } }); await act(async () => vi.advanceTimersByTime(250));
    expect(screen.getByRole("alert").textContent).toContain("Too long"); expect((screen.getByRole("button", { name: "Download PNG" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("copies the exact input and handles rejection without losing state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<QrCodeGenerator labels={labels} renderer={okRenderer} />); fireEvent.change(screen.getByRole("textbox"), { target: { value: "  exact\n" } }); fireEvent.click(screen.getByRole("button", { name: "Copy input" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("  exact\n")); expect(screen.getByText("Copied")).toBeTruthy();
    writeText.mockRejectedValueOnce(new Error("denied")); fireEvent.click(screen.getByRole("button", { name: "Copy input" })); expect((await screen.findByRole("alert")).textContent).toContain("Copy failed");
  });

  it("downloads an exact PNG filename, revokes its URL, and handles null Blob", async () => {
    vi.useFakeTimers(); const createObjectURL = vi.fn(() => "blob:qr"); const revokeObjectURL = vi.fn(); Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL }); Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined); render(<QrCodeGenerator labels={labels} renderer={okRenderer} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } }); await act(async () => vi.advanceTimersByTime(250));
    const canvas = screen.getByRole("img") as HTMLCanvasElement; const toBlob = vi.fn((callback: BlobCallback) => callback(new Blob(["png"], { type: "image/png" }))); canvas.toBlob = toBlob;
    fireEvent.click(screen.getByRole("button", { name: "Download PNG" })); expect(createObjectURL).toHaveBeenCalled(); expect(revokeObjectURL).toHaveBeenCalledWith("blob:qr"); expect(screen.getByText("Downloaded")).toBeTruthy();
    canvas.toBlob = vi.fn((callback: BlobCallback) => callback(null)); fireEvent.click(screen.getByRole("button", { name: "Download PNG" })); expect(screen.getByRole("alert").textContent).toContain("Download failed");
  });

  it("clears state, restores defaults and focus, and ignores stale results", async () => {
    vi.useFakeTimers(); let finish!: (value: Awaited<ReturnType<QrRenderer>>) => void; const delayed: QrRenderer = () => new Promise((resolve) => { finish = resolve; });
    render(<QrCodeGenerator labels={labels} renderer={delayed} />); const input = screen.getByRole("textbox"); fireEvent.change(input, { target: { value: "Hello" } }); await act(async () => vi.advanceTimersByTime(250));
    fireEvent.change(screen.getByRole("combobox", { name: /Size/ }), { target: { value: "512" } }); fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    finish({ ok: true, metadata: { version: 1, moduleCount: 21, modulePixels: 8, warning: false, effectiveLevel: "M" } }); await act(async () => Promise.resolve());
    expect((screen.getByRole("combobox", { name: /Size/ }) as HTMLSelectElement).value).toBe("256"); expect(document.activeElement).toBe(input); expect(screen.queryByText("512 × 512px")).toBeNull();
  });

  it("switches to the Wi-Fi source, builds the payload from the form, and hides the free-text box", async () => {
    vi.useFakeTimers(); render(<QrCodeGenerator labels={labels} renderer={okRenderer} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Source type" }), { target: { value: "wifi" } });
    expect(screen.queryByRole("textbox", { name: "Content" })).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Network name (SSID)" }), { target: { value: "HomeNet" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    await act(async () => vi.advanceTimersByTime(250));
    expect(okRenderer).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), "WIFI:T:WPA;S:HomeNet;P:secret;H:false;;", { size: 256, level: "M", margin: 4 });
    expect(screen.getByText("WIFI:T:WPA;S:HomeNet;P:secret;H:false;;")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Security" }), { target: { value: "nopass" } });
    expect(screen.queryByLabelText("Password")).toBeNull();
    await act(async () => vi.advanceTimersByTime(250));
    expect(okRenderer).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), "WIFI:T:nopass;S:HomeNet;H:false;;", { size: 256, level: "M", margin: 4 });
  });

  it("rejects out-of-range coordinates in the location source by producing no payload", async () => {
    vi.useFakeTimers(); render(<QrCodeGenerator labels={labels} renderer={okRenderer} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Source type" }), { target: { value: "location" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Latitude" }), { target: { value: "999" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Longitude" }), { target: { value: "10" } });
    await act(async () => vi.advanceTimersByTime(250));
    expect(okRenderer).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: "Latitude" }), { target: { value: "37.5" } });
    await act(async () => vi.advanceTimersByTime(250));
    expect(okRenderer).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), "geo:37.5,10", { size: 256, level: "M", margin: 4 });
  });

  it("uploads a logo, regenerates with it, and removing it regenerates without", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:logo") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const images: { onload: (() => void) | null; onerror: (() => void) | null; src: string }[] = [];
    class FakeImage { onload: (() => void) | null = null; onerror: (() => void) | null = null; src = ""; constructor() { images.push(this); } }
    vi.stubGlobal("Image", FakeImage);

    render(<QrCodeGenerator labels={labels} renderer={okRenderer} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Content" }), { target: { value: "Hello" } });
    await waitFor(() => expect(okRenderer).toHaveBeenCalledTimes(1));

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    const fileInput = document.getElementById("qr-logo-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    act(() => { images.at(-1)?.onload?.(); });

    await waitFor(() => expect(okRenderer).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), "Hello", { size: 256, level: "M", margin: 4 }, { image: images.at(-1), sizeRatio: 0.2 }));
    expect(screen.getByText("Error correction raised to keep the code scannable.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove logo" }));
    await waitFor(() => expect(okRenderer).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), "Hello", { size: 256, level: "M", margin: 4 }));
    expect(screen.queryByText("Error correction raised to keep the code scannable.")).toBeNull();
  });

  it("shows an inline error for a non-image logo file without touching the QR code", async () => {
    render(<QrCodeGenerator labels={labels} renderer={okRenderer} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Content" }), { target: { value: "Hello" } });
    await waitFor(() => expect(okRenderer).toHaveBeenCalledTimes(1));
    const calls = (okRenderer as ReturnType<typeof vi.fn>).mock.calls.length;

    const file = new File(["not an image"], "note.txt", { type: "text/plain" });
    const fileInput = document.getElementById("qr-logo-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByRole("alert").textContent).toContain("Choose an image file.");
    expect((okRenderer as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });
});
