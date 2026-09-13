import { inspectContainer } from "./container-scanner";
import type { MetadataSummary, SupportedImageMime } from "./types";

type ExifrResult = Record<string, unknown> | undefined;

// Keep the inspector bounded: binary MakerNotes and arbitrarily large XMP values are not displayed.
export const DISPLAY_TAGS = [
  "Make", "Model", "LensMake", "LensModel", "BodySerialNumber", "LensSerialNumber",
  "DateTimeOriginal", "CreateDate", "ModifyDate", "Software", "Artist", "Creator", "Copyright",
  "ImageDescription", "UserComment", "ExposureTime", "FNumber", "ISO", "FocalLength",
  "ExposureProgram", "ExposureBiasValue", "Flash", "WhiteBalance", "Orientation",
  "ColorSpace", "PixelXDimension", "PixelYDimension", "GPSAltitude", "latitude", "longitude",
] as const;

const SENSITIVE_TAGS = new Set<string>(["latitude", "longitude", "GPSAltitude", "BodySerialNumber", "LensSerialNumber"]);

export function displayFields(parsed: ExifrResult): MetadataSummary["fields"] {
  return DISPLAY_TAGS.flatMap(tag => {
    const value = formatField(parsed?.[tag]);
    return value === undefined ? [] : [{ tag, value, sensitive: SENSITIVE_TAGS.has(tag) }];
  });
}

function formatField(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? undefined : value.toISOString();
  if (typeof value === "string") return value.trim() ? value.trim().slice(0, 300) : undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  // Do not stringify objects, arrays, embedded XML, or binary buffers.
  return undefined;
}

export async function readMetadata(file: File, mime: SupportedImageMime): Promise<MetadataSummary> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const container = inspectContainer(bytes, mime);
  try {
    const { parse } = await import("exifr");
    const parsed = await parse(file, {
      tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: false,
      makerNote: false, userComment: true, mergeOutput: true,
      pick: [...DISPLAY_TAGS, "GPSLatitude", "GPSLongitude", "GPSLatitudeRef", "GPSLongitudeRef"],
    }) as ExifrResult;
    const latitude = finiteNumber(parsed?.latitude);
    const longitude = finiteNumber(parsed?.longitude);
    const kinds = [...container.kinds];
    if (latitude !== undefined && longitude !== undefined && !kinds.includes("gps")) kinds.push("gps");
    return {
      ...container,
      kinds,
      fields: displayFields(parsed),
      camera: join([stringValue(parsed?.Make), stringValue(parsed?.Model)]),
      lens: stringValue(parsed?.LensModel),
      capturedAt: dateValue(parsed?.DateTimeOriginal ?? parsed?.CreateDate),
      software: stringValue(parsed?.Software),
      creator: stringValue(parsed?.Artist ?? parsed?.Creator ?? parsed?.Copyright),
      latitude, longitude,
      analysisIncomplete: false,
    };
  } catch {
    return { ...container, fields: [], analysisIncomplete: true };
  }
}

function stringValue(value: unknown) { return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : undefined; }
function finiteNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function dateValue(value: unknown) { return value instanceof Date && !Number.isNaN(value.valueOf()) ? value.toLocaleString() : stringValue(value); }
function join(values: Array<string | undefined>) { const result = values.filter(Boolean).join(" "); return result || undefined; }
