import { DurableObject } from "cloudflare:workers";

type Env = {
  SESSIONS: DurableObjectNamespace<TransferSession>;
  SESSION_RATE_LIMITER: RateLimit;
  ALLOWED_ORIGINS: string;
  REQUIRE_TURN?: string;
  SERVICE_ENABLED?: string;
  TURN_KEY_ID?: string;
  TURN_API_TOKEN?: string;
};
type StoredSession = { version: 1; createdAt: number; expiresAt: number; status: "WAITING" | "JOINED" | "NEGOTIATING" | "ACTIVE" | "ENDED"; senderSecretHash: string; receiverClaimed: boolean };
type Attachment = { role: "sender" | "receiver" | "pending"; authenticated: boolean; device?: string };

const WAITING_TTL_MS = 30 * 60 * 1000;
const ACTIVE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CONTROL_BYTES = 64 * 1024;

function cors(origin: string | null, env: Env): HeadersInit {
  const allowed = origin && env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).includes(origin);
  return { "Access-Control-Allow-Origin": allowed ? origin : "null", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "content-type", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Vary": "Origin" };
}
function randomToken(bytesLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(bytesLength)); let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function iceServers(env: Env): Promise<RTCIceServer[]> {
  if (!env.TURN_KEY_ID || !env.TURN_API_TOKEN) {
    if (env.REQUIRE_TURN === "true") throw new Error("TURN_NOT_CONFIGURED");
    return [{ urls: "stun:stun.cloudflare.com:3478" }];
  }
  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, { method: "POST", headers: { Authorization: `Bearer ${env.TURN_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ ttl: 7200 }) });
  if (!response.ok) throw new Error("TURN_CREDENTIAL_FAILED"); const body = await response.json<{ iceServers: RTCIceServer[] }>(); return body.iceServers;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url), origin = request.headers.get("Origin"), headers = cors(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const allowed = origin && env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).includes(origin);
    if (!allowed) return Response.json({ error: "ORIGIN_DENIED" }, { status: 403, headers });
    if (request.method === "POST" && url.pathname === "/v1/sessions") {
      if (env.SERVICE_ENABLED === "false") return Response.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers });
      const actor = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const { success } = await env.SESSION_RATE_LIMITER.limit({ key: actor });
      if (!success) return Response.json({ error: "RATE_LIMITED" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
      const sessionId = randomToken(16), senderSecret = randomToken(32), expiresAt = Date.now() + WAITING_TTL_MS;
      const stub = env.SESSIONS.getByName(sessionId); await stub.initialize(await sha256(senderSecret), expiresAt);
      try {
        const servers = await iceServers(env); const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        return Response.json({ sessionId, senderSecret, expiresAt, webSocketUrl: `${wsProtocol}//${url.host}/s/${sessionId}`, iceServers: servers }, { status: 201, headers });
      } catch { await stub.destroy(); return Response.json({ error: "TURN_UNAVAILABLE" }, { status: 503, headers }); }
    }
    const iceMatch = url.pathname.match(/^\/v1\/sessions\/([A-Za-z0-9_-]{22,64})\/ice$/);
    if (request.method === "POST" && iceMatch) {
      const stub = env.SESSIONS.getByName(iceMatch[1]); if (!await stub.isActive()) return Response.json({ error: "SESSION_NOT_FOUND" }, { status: 404, headers });
      try { return Response.json({ iceServers: await iceServers(env) }, { headers }); } catch { return Response.json({ error: "TURN_UNAVAILABLE" }, { status: 503, headers }); }
    }
    const match = url.pathname.match(/^\/s\/([A-Za-z0-9_-]{22,64})$/);
    if (match && request.headers.get("Upgrade")?.toLowerCase() === "websocket") return env.SESSIONS.getByName(match[1]).fetch(request);
    return new Response("Not found", { status: 404, headers });
  },
};

export default worker;

export class TransferSession extends DurableObject<Env> {
  async isActive(): Promise<boolean> { const session = await this.ctx.storage.get<StoredSession>("session"); return Boolean(session && session.expiresAt > Date.now() && session.status !== "ENDED"); }
  async initialize(senderSecretHash: string, expiresAt: number): Promise<void> {
    const existing = await this.ctx.storage.get<StoredSession>("session"); if (existing) return;
    await this.ctx.storage.put("session", { version: 1, createdAt: Date.now(), expiresAt, status: "WAITING", senderSecretHash, receiverClaimed: false } satisfies StoredSession);
    await this.ctx.storage.setAlarm(expiresAt);
  }
  async destroy(): Promise<void> { for (const socket of this.ctx.getWebSockets()) socket.close(1001, "session-ended"); await this.ctx.storage.deleteAlarm(); await this.ctx.storage.deleteAll(); }
  async alarm(): Promise<void> { for (const socket of this.ctx.getWebSockets()) socket.send(JSON.stringify({ type: "SESSION_ERROR", code: "SESSION_EXPIRED" })); await this.destroy(); }
  async fetch(): Promise<Response> {
    const session = await this.ctx.storage.get<StoredSession>("session"); if (!session || session.expiresAt <= Date.now()) return new Response("Expired", { status: 410 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1]; server.serializeAttachment({ role: "pending", authenticated: false } satisfies Attachment); this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }
  private socket(role: "sender" | "receiver"): WebSocket | undefined { return this.ctx.getWebSockets().find(socket => (socket.deserializeAttachment() as Attachment | null)?.role === role && (socket.deserializeAttachment() as Attachment).authenticated); }
  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).byteLength > MAX_CONTROL_BYTES) { socket.close(1009, "invalid-message"); return; }
    let message: Record<string, unknown>; try { message = JSON.parse(raw) as Record<string, unknown>; } catch { socket.close(1003, "invalid-json"); return; }
    const attachment = socket.deserializeAttachment() as Attachment; const session = await this.ctx.storage.get<StoredSession>("session"); if (!session) { socket.close(1008, "missing-session"); return; }
    if (!attachment.authenticated) {
      if (message.type === "AUTH_SENDER" && typeof message.secret === "string" && await sha256(message.secret) === session.senderSecretHash && !this.socket("sender")) {
        socket.serializeAttachment({ role: "sender", authenticated: true } satisfies Attachment); socket.send(JSON.stringify({ type: "AUTH_OK", role: "sender", expiresAt: session.expiresAt })); const receiver = this.socket("receiver"); if (receiver) socket.send(JSON.stringify({ type: "RECEIVER_JOINED", device: (receiver.deserializeAttachment() as Attachment).device ?? "Browser · Device" })); return;
      }
      if (message.type === "JOIN_RECEIVER" && !session.receiverClaimed && !this.socket("receiver")) {
        const device = typeof message.device === "string" ? message.device.slice(0, 64) : "Browser · Device"; socket.serializeAttachment({ role: "receiver", authenticated: true, device } satisfies Attachment);
        await this.ctx.storage.put("session", { ...session, receiverClaimed: true, status: "JOINED" }); socket.send(JSON.stringify({ type: "AUTH_OK", role: "receiver", expiresAt: session.expiresAt })); this.socket("sender")?.send(JSON.stringify({ type: "RECEIVER_JOINED", device })); return;
      }
      socket.send(JSON.stringify({ type: "SESSION_ERROR", code: session.receiverClaimed ? "SESSION_OCCUPIED" : "PROTOCOL_ERROR" })); socket.close(1008, "auth-failed"); return;
    }
    const role = attachment.role as "sender" | "receiver", peer = this.socket(role === "sender" ? "receiver" : "sender");
    if (message.type === "CANCEL_SESSION") { peer?.send(JSON.stringify({ type: "PEER_LEFT", role })); await this.destroy(); return; }
    if (role === "sender" && (message.type === "APPROVE_RECEIVER" || message.type === "REJECT_RECEIVER")) { peer?.send(raw); if (message.type === "APPROVE_RECEIVER") { const expiresAt = Date.now() + ACTIVE_TTL_MS; await this.ctx.storage.put("session", { ...session, expiresAt, status: "NEGOTIATING" }); await this.ctx.storage.setAlarm(expiresAt); } else { peer?.close(1008, "rejected"); await this.ctx.storage.put("session", { ...session, receiverClaimed: false, status: "WAITING" }); } return; }
    if (message.type === "SIGNAL" && peer) { peer.send(raw); return; }
    socket.send(JSON.stringify({ type: "SESSION_ERROR", code: "PROTOCOL_ERROR" }));
  }
  async webSocketClose(socket: WebSocket): Promise<void> {
    const attachment = socket.deserializeAttachment() as Attachment | null; if (!attachment?.authenticated) return;
    this.socket(attachment.role === "sender" ? "receiver" : "sender")?.send(JSON.stringify({ type: "PEER_LEFT", role: attachment.role }));
    if (attachment.role === "receiver") { const session = await this.ctx.storage.get<StoredSession>("session"); if (session && session.status !== "ACTIVE") await this.ctx.storage.put("session", { ...session, receiverClaimed: false, status: "WAITING" }); }
  }
}
