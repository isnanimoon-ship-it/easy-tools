export const CHUNK_SIZE = 64 * 1024;
export const BUFFER_HIGH_WATERMARK = 4 * 1024 * 1024;
export const BUFFER_LOW_WATERMARK = 1024 * 1024;
export const ACK_WINDOW_CHUNKS = 32;
export const CONTROL_MESSAGE_LIMIT = 16 * 1024;
export const LIMITED_RECEIVER_LIMIT = 200 * 1024 * 1024;
export const FULL_RECEIVER_LIMIT = 10 * 1024 * 1024 * 1024;

export type TransferRole = "sender" | "receiver";
export type TransferState =
  | "IDLE" | "FILE_SELECTED" | "SESSION_CREATING" | "WAITING_FOR_RECEIVER"
  | "RECEIVER_JOINED" | "NEGOTIATING" | "CONNECTED" | "WAITING_RECEIVER_ACCEPT"
  | "READY" | "TRANSFERRING" | "VERIFYING" | "COMPLETED" | "FAILED"
  | "CANCELLED" | "EXPIRED";

export type TransferErrorCode =
  | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "SESSION_OCCUPIED" | "SENDER_OFFLINE"
  | "RECEIVER_REJECTED" | "ICE_FAILED" | "TURN_UNAVAILABLE" | "FILE_READ_FAILED"
  | "FILE_TOO_LARGE_FOR_BROWSER" | "DISK_WRITE_FAILED" | "HASH_MISMATCH"
  | "PEER_DISCONNECTED" | "PROTOCOL_ERROR" | "SERVICE_UNAVAILABLE";

export type SafeFileMetadata = { name: string; size: number; mimeType: string };
export type ConnectionKind = "unknown" | "direct" | "relay";
export type SessionResponse = {
  sessionId: string;
  senderSecret: string;
  expiresAt: number;
  webSocketUrl: string;
  iceServers: RTCIceServer[];
};

export type SignalingMessage =
  | { type: "AUTH_SENDER"; secret: string }
  | { type: "JOIN_RECEIVER"; device: string }
  | { type: "AUTH_OK"; role: TransferRole; expiresAt: number }
  | { type: "RECEIVER_JOINED"; device: string }
  | { type: "APPROVE_RECEIVER" }
  | { type: "REJECT_RECEIVER" }
  | { type: "APPROVED" }
  | { type: "SIGNAL"; payload: RTCSessionDescriptionInit | RTCIceCandidateInit }
  | { type: "PEER_LEFT"; role: TransferRole }
  | { type: "SESSION_ERROR"; code: TransferErrorCode }
  | { type: "CANCEL_SESSION" };

export type ControlMessage =
  | { v: 1; type: "META"; transferId: string; file: SafeFileMetadata; chunkSize: number; totalChunks: number; hash: "sha-256" }
  | { v: 1; type: "ACCEPT"; transferId: string; saveMode: "stream" | "blob" }
  | { v: 1; type: "REJECT"; transferId: string; reason: "user" | "size" | "unsupported" }
  | { v: 1; type: "START"; transferId: string }
  | { v: 1; type: "RECEIVE_ACK"; transferId: string; receivedBytes: number; contiguousChunk: number }
  | { v: 1; type: "END"; transferId: string; size: number; sha256: string }
  | { v: 1; type: "COMPLETE_ACK"; transferId: string; size: number; sha256: string }
  | { v: 1; type: "CANCEL"; transferId: string; reason: string }
  | { v: 1; type: "ERROR"; transferId?: string; code: TransferErrorCode };

export type TransferMetrics = { bytes: number; total: number; progress: number; bytesPerSecond: number | null; etaSeconds: number | null };
