export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

export type MetadataKind = "exif" | "gps" | "xmp" | "iptc" | "icc" | "comment" | "text";

export type ContainerInspection = {
  kinds: MetadataKind[];
  animated: boolean;
};

export type MetadataSummary = ContainerInspection & {
  fields: Array<{ tag: string; value: string; sensitive: boolean }>;
  camera?: string;
  lens?: string;
  capturedAt?: string;
  software?: string;
  creator?: string;
  latitude?: number;
  longitude?: number;
  analysisIncomplete: boolean;
};
