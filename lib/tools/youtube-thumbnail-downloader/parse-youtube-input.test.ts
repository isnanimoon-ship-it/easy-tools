import { describe, expect, it } from "vitest";
import { parseYouTubeInput } from "./parse-youtube-input";

const id = "dQw4w9WgXcQ";

describe("parseYouTubeInput", () => {
  it.each([
    `https://youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&list=PL1&t=3#x`,
    `http://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtu.be/${id}`,
    `https://youtube.com/shorts/${id}`,
    `https://youtube.com/embed/${id}/`,
    `https://youtube.com/live/${id}?feature=share`,
    `youtube.com/watch?v=${id}`,
    `\u3000https://youtu.be/${id}\n`,
    id,
  ])("extracts the ID from %s", (input) => expect(parseYouTubeInput(input)).toEqual({ ok: true, videoId: id }));

  it.each([
    ["", "empty"], ["https://example.com/watch?v=dQw4w9WgXcQ", "not-youtube"],
    ["https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "not-youtube"],
    ["javascript:alert(1)", "invalid-url"], ["https://user@youtube.com/watch?v=dQw4w9WgXcQ", "invalid-url"],
    ["https://youtube.com/playlist?list=PL1", "unsupported-format"],
    ["https://youtube.com/watch", "missing-video-id"], ["https://youtube.com/shorts/", "missing-video-id"],
    ["https://youtu.be/short", "invalid-video-id"], ["https://youtu.be/dQw4w9WgXcQ/extra", "unsupported-format"],
  ])("rejects %s", (input, reason) => expect(parseYouTubeInput(input)).toEqual({ ok: false, reason }));

  it("handles a very long query without changing the ID", () => {
    expect(parseYouTubeInput(`https://youtube.com/watch?v=${id}&x=${"a".repeat(10000)}`)).toEqual({ ok: true, videoId: id });
  });
});
