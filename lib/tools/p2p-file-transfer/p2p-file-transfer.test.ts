import { describe, expect, it, vi } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { sendFileChunks } from "./backpressure";
import { isPotentiallyDangerousFileName, sanitizeFileName, utf8Length } from "./filename";
import { calculateMetrics, formatBytes } from "./metrics";
import { ACK_WINDOW_CHUNKS, CHUNK_SIZE } from "./model";
import { createTransferId, decodeChunk, decodeControl, encodeChunk, encodeControl, isSessionId } from "./protocol";
import { shouldWarnBeforeUnload, transition } from "./state-machine";

describe("P2P transfer protocol", () => {
  it("round-trips control messages", () => {
    const message = { v: 1, type: "START", transferId: "a".repeat(32) } as const;
    expect(decodeControl(encodeControl(message))).toEqual(message);
    expect(() => decodeControl("{}")).toThrow("invalid-control");
  });

  it("round-trips a binary frame and rejects damaged lengths", () => {
    const id = "ab".repeat(16), payload = new TextEncoder().encode("안녕하세요 😀").buffer;
    const frame = encodeChunk(id, 7, payload);
    const decoded = decodeChunk(frame, CHUNK_SIZE);
    expect(decoded.transferId).toBe(id);
    expect(decoded.chunkIndex).toBe(7);
    expect(new TextDecoder().decode(decoded.payload)).toBe("안녕하세요 😀");
    new DataView(frame).setUint32(22, CHUNK_SIZE + 1);
    expect(() => decodeChunk(frame, CHUNK_SIZE)).toThrow("invalid-frame");
  });

  it("creates valid identifiers", () => {
    const ids = new Set(Array.from({ length: 100 }, createTransferId));
    expect(ids.size).toBe(100);
    expect([...ids].every(id => /^[0-9a-f]{32}$/.test(id))).toBe(true);
    expect(isSessionId("A_-bcdefghijklmnopqrstu")).toBe(true);
    expect(isSessionId("short")).toBe(false);
  });
});

describe("P2P transfer policies", () => {
  it("sanitizes unsafe and oversized filenames", () => {
    expect(sanitizeFileName("../secret\\name.txt")).toBe(".._secret_name.txt");
    expect(sanitizeFileName("CON")).toBe("file_CON");
    expect(utf8Length(sanitizeFileName(`${"한".repeat(200)}.txt`))).toBeLessThanOrEqual(255);
    expect(isPotentiallyDangerousFileName("photo.JPG")).toBe(false);
    expect(isPotentiallyDangerousFileName("invoice.exe")).toBe(true);
  });

  it("allows only declared state transitions", () => {
    expect(transition("IDLE", "SELECT_FILE")).toBe("FILE_SELECTED");
    expect(transition("IDLE", "COMPLETE_ACK")).toBe("IDLE");
    expect(shouldWarnBeforeUnload("TRANSFERRING")).toBe(true);
    expect(shouldWarnBeforeUnload("COMPLETED")).toBe(false);
  });

  it("calculates progress, speed, ETA and byte labels", () => {
    const metrics = calculateMetrics([{ at: 0, bytes: 0 }, { at: 1000, bytes: 65536 }], 131072, 262144, 2000);
    expect(metrics.progress).toBe(50);
    expect(metrics.bytesPerSecond).toBe(65536);
    expect(metrics.etaSeconds).toBe(2);
    expect(formatBytes(1048576)).toContain("MiB");
  });
});

describe("chunk sender", () => {
  it("chunks data and waits for window acknowledgements", async () => {
    const size = CHUNK_SIZE * ACK_WINDOW_CHUNKS + 17;
    const channel = new EventTarget() as RTCDataChannel;
    Object.assign(channel, { bufferedAmount: 0, bufferedAmountLowThreshold: 0, readyState: "open", send: vi.fn(), maxPacketLifeTime: null });
    const progress = vi.fn(), waitForAck = vi.fn(async () => undefined), hash = vi.fn();
    const file = new NodeBlob([new Uint8Array(size)]) as unknown as Blob;
    await sendFileChunks(file, channel, "01".repeat(16), new AbortController().signal, progress, waitForAck, hash);
    expect(channel.send).toHaveBeenCalledTimes(ACK_WINDOW_CHUNKS + 1);
    expect(waitForAck).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenLastCalledWith({ bytes: size, chunkIndex: ACK_WINDOW_CHUNKS });
    expect(hash).toHaveBeenCalledTimes(ACK_WINDOW_CHUNKS + 1);
  });
});
