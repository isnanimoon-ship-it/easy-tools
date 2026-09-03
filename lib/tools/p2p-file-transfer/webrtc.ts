import type { ConnectionKind, SignalingMessage } from "./model";

export type PeerCallbacks = {
  sendSignal(message: SignalingMessage): void;
  onChannel(channel: RTCDataChannel): void;
  onState(state: RTCPeerConnectionState): void;
};

export class PeerSession {
  readonly connection: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  constructor(private readonly initiator: boolean, iceServers: RTCIceServer[], private readonly callbacks: PeerCallbacks) {
    this.connection = new RTCPeerConnection({ iceServers });
    this.connection.onicecandidate = event => { if (event.candidate) callbacks.sendSignal({ type: "SIGNAL", payload: event.candidate.toJSON() }); };
    this.connection.onconnectionstatechange = () => callbacks.onState(this.connection.connectionState);
    this.connection.ondatachannel = event => callbacks.onChannel(event.channel);
  }
  async start(): Promise<RTCDataChannel | null> {
    if (!this.initiator) return null;
    const channel = this.connection.createDataChannel("file-v1", { ordered: true }); this.callbacks.onChannel(channel);
    await this.connection.setLocalDescription(await this.connection.createOffer());
    this.callbacks.sendSignal({ type: "SIGNAL", payload: this.connection.localDescription!.toJSON() }); return channel;
  }
  async accept(payload: RTCSessionDescriptionInit | RTCIceCandidateInit): Promise<void> {
    if ("type" in payload && payload.type) {
      await this.connection.setRemoteDescription(payload as RTCSessionDescriptionInit);
      for (const candidate of this.pendingCandidates.splice(0)) await this.connection.addIceCandidate(candidate);
      if (payload.type === "offer") { await this.connection.setLocalDescription(await this.connection.createAnswer()); this.callbacks.sendSignal({ type: "SIGNAL", payload: this.connection.localDescription!.toJSON() }); }
    } else if (this.connection.remoteDescription) await this.connection.addIceCandidate(payload as RTCIceCandidateInit);
    else this.pendingCandidates.push(payload as RTCIceCandidateInit);
  }
  async connectionKind(): Promise<ConnectionKind> {
    const stats = await this.connection.getStats(); let kind: ConnectionKind = "unknown";
    stats.forEach(report => { if (report.type !== "candidate-pair" || report.state !== "succeeded" || !report.nominated) return; const local = stats.get(report.localCandidateId); const remote = stats.get(report.remoteCandidateId); kind = local?.candidateType === "relay" || remote?.candidateType === "relay" ? "relay" : "direct"; }); return kind;
  }
  close(): void { this.connection.onicecandidate = null; this.connection.onconnectionstatechange = null; this.connection.ondatachannel = null; this.connection.close(); }
}

export function openSignaling(url: string, authentication: SignalingMessage, onMessage: (message: SignalingMessage) => void): WebSocket {
  const socket = new WebSocket(url); socket.addEventListener("open", () => socket.send(JSON.stringify(authentication)));
  socket.addEventListener("message", event => { if (typeof event.data !== "string" || event.data.length > 64 * 1024) return; try { const value = JSON.parse(event.data) as SignalingMessage; if (value && typeof value === "object" && "type" in value) onMessage(value); } catch { /* Invalid signaling is ignored and never logged with sensitive payloads. */ } });
  return socket;
}
