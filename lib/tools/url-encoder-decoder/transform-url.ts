export type UrlConversionMode = "encode" | "decode";
export type UrlEncodingType = "component" | "full-url";
export type UrlTransformError = "invalid-percent-encoding" | "invalid-unicode";

export type UrlTransformResult =
  | { ok: true; value: string }
  | { ok: false; reason: UrlTransformError };

export function transformUrl(
  input: string,
  mode: UrlConversionMode,
  encodingType: UrlEncodingType,
): UrlTransformResult {
  try {
    if (mode === "encode") {
      return {
        ok: true,
        value: encodingType === "component" ? encodeURIComponent(input) : encodeURI(input),
      };
    }

    return {
      ok: true,
      value: encodingType === "component" ? decodeURIComponent(input) : decodeURI(input),
    };
  } catch {
    return {
      ok: false,
      reason: mode === "encode" ? "invalid-unicode" : "invalid-percent-encoding",
    };
  }
}
