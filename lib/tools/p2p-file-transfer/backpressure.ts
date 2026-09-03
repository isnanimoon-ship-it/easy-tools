import { ACK_WINDOW_CHUNKS, BUFFER_HIGH_WATERMARK, BUFFER_LOW_WATERMARK, CHUNK_SIZE } from "./model";
import { encodeChunk } from "./protocol";

export type SendProgress = { bytes: number; chunkIndex: number };

function waitForLowBuffer(channel: RTCDataChannel, signal: AbortSignal): Promise<void> {
  if (channel.bufferedAmount < BUFFER_HIGH_WATERMARK) return Promise.resolve();
  channel.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK;
  return new Promise((resolve, reject) => {
    const cleanup = () => { channel.removeEventListener("bufferedamountlow", low); channel.removeEventListener("close", closed); signal.removeEventListener("abort", aborted); };
    const low = () => { cleanup(); resolve(); }; const closed = () => { cleanup(); reject(new Error("channel-closed")); }; const aborted = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    channel.addEventListener("bufferedamountlow", low, { once: true }); channel.addEventListener("close", closed, { once: true }); signal.addEventListener("abort", aborted, { once: true });
  });
}

export async function sendFileChunks(file: Blob, channel: RTCDataChannel, transferId: string, signal: AbortSignal, onProgress: (value: SendProgress) => void, waitForAck?: (chunkIndex: number) => Promise<void>, onChunk?: (payload: Uint8Array) => void): Promise<void> {
  const chunkSize = CHUNK_SIZE;
  let offset = 0, chunkIndex = 0;
  while (offset < file.size) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError"); if (channel.readyState !== "open") throw new Error("channel-closed");
    await waitForLowBuffer(channel, signal);
    const end = Math.min(file.size, offset + chunkSize); const payload = await file.slice(offset, end).arrayBuffer(); onChunk?.(new Uint8Array(payload)); channel.send(encodeChunk(transferId, chunkIndex, payload));
    offset = end; onProgress({ bytes: offset, chunkIndex });
    if (waitForAck && (chunkIndex + 1) % ACK_WINDOW_CHUNKS === 0) await waitForAck(chunkIndex);
    chunkIndex++;
  }
}
