import { CONTROL_MESSAGE_LIMIT, type ControlMessage } from "./model";

const VERSION = 1, FILE_CHUNK = 1, HEADER_SIZE = 26;

export function createTransferId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export function encodeControl(message: ControlMessage): string {
  const encoded = JSON.stringify(message); if (new TextEncoder().encode(encoded).byteLength > CONTROL_MESSAGE_LIMIT) throw new Error("control-too-large"); return encoded;
}

export function decodeControl(input: string): ControlMessage {
  if (new TextEncoder().encode(input).byteLength > CONTROL_MESSAGE_LIMIT) throw new Error("control-too-large");
  const value: unknown = JSON.parse(input); if (!value || typeof value !== "object") throw new Error("invalid-control");
  const record = value as Record<string, unknown>;
  if (record.v !== 1 || typeof record.type !== "string" || (record.transferId !== undefined && typeof record.transferId !== "string")) throw new Error("invalid-control");
  return value as ControlMessage;
}

export function encodeChunk(transferId: string, chunkIndex: number, payload: ArrayBuffer): ArrayBuffer {
  if (!/^[0-9a-f]{32}$/.test(transferId) || !Number.isInteger(chunkIndex) || chunkIndex < 0) throw new Error("invalid-frame");
  const output = new ArrayBuffer(HEADER_SIZE + payload.byteLength), view = new DataView(output), bytes = new Uint8Array(output);
  view.setUint8(0, VERSION); view.setUint8(1, FILE_CHUNK);
  for (let index = 0; index < 16; index++) view.setUint8(2 + index, Number.parseInt(transferId.slice(index * 2, index * 2 + 2), 16));
  view.setUint32(18, chunkIndex); view.setUint32(22, payload.byteLength); bytes.set(new Uint8Array(payload), HEADER_SIZE); return output;
}

export function decodeChunk(frame: ArrayBuffer, maxPayload: number): { transferId: string; chunkIndex: number; payload: Uint8Array } {
  if (frame.byteLength < HEADER_SIZE) throw new Error("invalid-frame"); const view = new DataView(frame);
  const length = view.getUint32(22); if (view.getUint8(0) !== VERSION || view.getUint8(1) !== FILE_CHUNK || length > maxPayload || frame.byteLength !== HEADER_SIZE + length) throw new Error("invalid-frame");
  let transferId = ""; for (let index = 0; index < 16; index++) transferId += view.getUint8(2 + index).toString(16).padStart(2, "0");
  return { transferId, chunkIndex: view.getUint32(18), payload: new Uint8Array(frame, HEADER_SIZE, length) };
}

export function isSessionId(value: string): boolean { return /^[A-Za-z0-9_-]{22,64}$/.test(value); }
