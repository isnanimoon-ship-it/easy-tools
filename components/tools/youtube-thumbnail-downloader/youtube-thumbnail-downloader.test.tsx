import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeThumbnailDownloader, type ImageLoader, type YouTubeThumbnailLabels } from "./youtube-thumbnail-downloader";

const labels: YouTubeThumbnailLabels = {
  inputLabel: "YouTube URL", inputHelp: "Paste a video URL", placeholder: "https://youtube.com/watch?v=...", extract: "Extract", clear: "Clear", loading: "Loading",
  videoId: "Video ID", available: "Available", unavailable: "Unavailable", resolution: "Resolution", open: "Open image", save: "Download", saving: "Saving", saved: "Saved", saveError: "Save failed",
  errors: { "not-youtube": "Not YouTube", "invalid-url": "Invalid URL", "unsupported-format": "Unsupported. Copy a video URL.", "missing-video-id": "No video ID", "invalid-video-id": "Invalid video ID", "thumbnail-unavailable": "No thumbnail", network: "Could not check images" },
  variants: { max: "Max", sd: "SD", hq: "HQ", mq: "MQ", default: "Default" },
};

const sizes: Record<string, [number, number]> = { maxresdefault: [1280, 720], sddefault: [640, 480], hqdefault: [480, 360], mqdefault: [320, 180], default: [120, 90] };
const loader: ImageLoader = async (url) => {
  const entry = Object.entries(sizes).find(([name]) => url.includes(name));
  return { loaded: true, width: entry?.[1][0] ?? 0, height: entry?.[1][1] ?? 0 };
};

afterEach(() => vi.restoreAllMocks());

describe("YouTubeThumbnailDownloader", () => {
  it("starts empty, extracts on form submit, and shows five verified cards", async () => {
    render(<YouTubeThumbnailDownloader labels={labels} imageLoader={loader} />);
    expect((screen.getByRole("button", { name: "Extract" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "YouTube URL" }), { target: { value: "https://youtu.be/dQw4w9WgXcQ?si=share" } });
    fireEvent.submit(screen.getByRole("textbox", { name: "YouTube URL" }).closest("form")!);
    expect(await screen.findByText("dQw4w9WgXcQ")).toBeTruthy();
    await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(5));
    expect(screen.getByText("Resolution: 1280 × 720")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open image" })[0].getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("rejects unsupported addresses with novice-friendly guidance and no console error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<YouTubeThumbnailDownloader labels={labels} imageLoader={loader} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "https://youtube.com/channel/example" } });
    fireEvent.click(screen.getByRole("button", { name: "Extract" }));
    expect(screen.getByRole("alert").textContent).toContain("Copy a video URL");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("rejects placeholder high resolutions but keeps usable cards", async () => {
    const placeholderLoader: ImageLoader = async (url) => url.includes("maxres") || url.includes("sddefault")
      ? { loaded: true, width: 120, height: 90 } : loader(url, 10_000);
    render(<YouTubeThumbnailDownloader labels={labels} imageLoader={placeholderLoader} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "dQw4w9WgXcQ" } });
    fireEvent.click(screen.getByRole("button", { name: "Extract" }));
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(2));
    expect(document.querySelectorAll("img")).toHaveLength(3);
  });

  it("invalidates stale results when cleared and restores focus", async () => {
    let resolve!: (value: { loaded: boolean; width: number; height: number }) => void;
    const delayed: ImageLoader = () => new Promise((done) => { resolve = done; });
    render(<YouTubeThumbnailDownloader labels={labels} imageLoader={delayed} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "dQw4w9WgXcQ" } }); fireEvent.click(screen.getByRole("button", { name: "Extract" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    resolve({ loaded: true, width: 1280, height: 720 });
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(screen.queryByText("dQw4w9WgXcQ")).toBeNull();
  });

  it("downloads a verified image Blob and reports fetch failure", async () => {
    const createObjectURL = vi.fn(() => "blob:test"); const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["x"], { type: "image/jpeg" }), { status: 200, headers: { "content-type": "image/jpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<YouTubeThumbnailDownloader labels={labels} imageLoader={loader} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "dQw4w9WgXcQ" } }); fireEvent.click(screen.getByRole("button", { name: "Extract" }));
    const buttons = await screen.findAllByRole("button", { name: "Download" }); fireEvent.click(buttons[0]);
    expect(await screen.findByText("Saved")).toBeTruthy(); expect(createObjectURL).toHaveBeenCalled(); expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    fetchMock.mockRejectedValueOnce(new Error("CORS")); fireEvent.click((await screen.findAllByRole("button", { name: "Download" }))[0]);
    expect(await screen.findByText("Save failed")).toBeTruthy();
  });
});
