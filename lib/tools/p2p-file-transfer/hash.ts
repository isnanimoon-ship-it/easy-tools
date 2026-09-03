import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export async function hashBlob(blob: Blob, chunkSize = 1024 * 1024, onProgress?: (bytes: number) => void): Promise<string> {
  const hash = sha256.create();
  for (let offset = 0; offset < blob.size; offset += chunkSize) { const bytes = new Uint8Array(await blob.slice(offset, Math.min(blob.size, offset + chunkSize)).arrayBuffer()); hash.update(bytes); onProgress?.(Math.min(blob.size, offset + bytes.byteLength)); }
  return bytesToHex(hash.digest());
}
