export type YouTubeInputError =
  | "empty"
  | "not-youtube"
  | "invalid-url"
  | "unsupported-format"
  | "missing-video-id"
  | "invalid-video-id";

export type ParseYouTubeInputResult =
  | { ok: true; videoId: string }
  | { ok: false; reason: YouTubeInputError };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const SCHEMELESS_HOST = /^(?:www\.|m\.)?youtube\.com(?:[/?#]|$)|^(?:www\.)?youtu\.be(?:[/?#]|$)/i;

function validateId(value: string | null): ParseYouTubeInputResult {
  if (!value) return { ok: false, reason: "missing-video-id" };
  return VIDEO_ID.test(value)
    ? { ok: true, videoId: value }
    : { ok: false, reason: "invalid-video-id" };
}

export function parseYouTubeInput(input: string): ParseYouTubeInputResult {
  const value = input.trim();
  if (!value) return { ok: false, reason: "empty" };
  if (VIDEO_ID.test(value)) return { ok: true, videoId: value };

  let parsed: URL;
  try {
    parsed = new URL(SCHEMELESS_HOST.test(value) ? `https://${value}` : value);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    return { ok: false, reason: "invalid-url" };
  }
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host) && !SHORT_HOSTS.has(host)) {
    return { ok: false, reason: "not-youtube" };
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (SHORT_HOSTS.has(host)) {
    if (segments.length === 0) return { ok: false, reason: "missing-video-id" };
    if (segments.length !== 1) return { ok: false, reason: "unsupported-format" };
    return validateId(segments[0]);
  }

  if (parsed.pathname === '/watch' || parsed.pathname === '/watch/') {
    return validateId(parsed.searchParams.get('v'));
  }
  if (segments.length === 1 && ['shorts', 'embed', 'live'].includes(segments[0])) {
    return { ok: false, reason: "missing-video-id" };
  }
  if (segments.length === 2 && ['shorts', 'embed', 'live'].includes(segments[0])) {
    return validateId(segments[1]);
  }
  return { ok: false, reason: "unsupported-format" };
}
