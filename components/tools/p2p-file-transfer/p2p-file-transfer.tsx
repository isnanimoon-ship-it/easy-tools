"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, FileUp, LoaderCircle, QrCode, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { sendFileChunks } from "@/lib/tools/p2p-file-transfer/backpressure";
import { coarseDeviceLabel, isPotentiallyDangerousFileName, sanitizeFileName } from "@/lib/tools/p2p-file-transfer/filename";
import { calculateMetrics, formatBytes, type SpeedSample } from "@/lib/tools/p2p-file-transfer/metrics";
import { ACK_WINDOW_CHUNKS, CHUNK_SIZE, FULL_RECEIVER_LIMIT, LIMITED_RECEIVER_LIMIT, type ControlMessage, type SafeFileMetadata, type SessionResponse, type SignalingMessage, type TransferErrorCode, type TransferMetrics, type TransferState } from "@/lib/tools/p2p-file-transfer/model";
import { createTransferId, decodeChunk, decodeControl, encodeControl, isSessionId } from "@/lib/tools/p2p-file-transfer/protocol";
import { shouldWarnBeforeUnload } from "@/lib/tools/p2p-file-transfer/state-machine";
import { openSignaling, PeerSession } from "@/lib/tools/p2p-file-transfer/webrtc";
import { renderQrCode } from "@/lib/tools/qr-code-generator/qr-code";
import { bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";

const SIGNALING_URL = process.env.NEXT_PUBLIC_P2P_SIGNALING_URL?.replace(/\/$/, "") ?? "";
const emptyMetrics: TransferMetrics = { bytes: 0, total: 0, progress: 0, bytesPerSecond: null, etaSeconds: null };

type CommonResources = { socket: WebSocket | null; peer: PeerSession | null; channel: RTCDataChannel | null; abort: AbortController | null };

export function P2PFileTransfer({ role = "sender", sessionId = "" }: { role?: "sender" | "receiver"; sessionId?: string }) {
  return role === "sender" ? <Sender/> : <Receiver sessionId={sessionId}/>;
}

function Sender() {
  const t = useTranslations("Tools.p2pFileTransfer"), locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null), qrRef = useRef<HTMLCanvasElement>(null), resources = useRef<CommonResources>({ socket: null, peer: null, channel: null, abort: null });
  const ackRef = useRef<Array<{ chunk: number; resolve(): void }>>([]), samplesRef = useRef<SpeedSample[]>([]), lastUiRef = useRef(0), expectedHashRef = useRef("");
  const [file, setFile] = useState<File | null>(null), [state, setState] = useState<TransferState>("IDLE"), [session, setSession] = useState<SessionResponse | null>(null), [receiver, setReceiver] = useState(""), [metrics, setMetrics] = useState(emptyMetrics), [error, setError] = useState<TransferErrorCode | null>(null), [connection, setConnection] = useState<"unknown" | "direct" | "relay">("unknown"), [copied, setCopied] = useState(false), [dragging, setDragging] = useState(false);
  const shareUrl = session && typeof window !== "undefined" ? `${window.location.origin}/${locale}/t/${session.sessionId}` : "";

  const cleanup = useCallback(() => { resources.current.abort?.abort(); resources.current.channel?.close(); resources.current.peer?.close(); resources.current.socket?.close(); resources.current = { socket: null, peer: null, channel: null, abort: null }; ackRef.current.splice(0).forEach(waiter => waiter.resolve()); }, []);
  useEffect(() => cleanup, [cleanup]);
  useEffect(() => { if (!shouldWarnBeforeUnload(state)) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [state]);
  useEffect(() => { if (!shareUrl || !qrRef.current) return; renderQrCode(qrRef.current, shareUrl, { size: 256, level: "M", margin: 4 }); }, [shareUrl]);

  function selectFile(selected?: File) { if (!selected) return; cleanup(); setSession(null); setReceiver(""); if (selected.size > FULL_RECEIVER_LIMIT) { setFile(null); setMetrics(emptyMetrics); setError("FILE_TOO_LARGE_FOR_BROWSER"); setState("FAILED"); return; } setFile(selected); setMetrics({ ...emptyMetrics, total: selected.size }); setError(null); setState("FILE_SELECTED"); }
  async function createSession() {
    if (!file || !SIGNALING_URL) { setError("SERVICE_UNAVAILABLE"); setState("FAILED"); return; } setState("SESSION_CREATING"); setError(null);
    try {
      const response = await fetch(`${SIGNALING_URL}/v1/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("session"); const created = await response.json() as SessionResponse; setSession(created);
      const socket = openSignaling(created.webSocketUrl, { type: "AUTH_SENDER", secret: created.senderSecret }, handleSignal); resources.current.socket = socket; setState("WAITING_FOR_RECEIVER");
    } catch { setError("SERVICE_UNAVAILABLE"); setState("FAILED"); }
  }
  function handleSignal(message: SignalingMessage) {
    if (message.type === "RECEIVER_JOINED") { setReceiver(message.device); setState("RECEIVER_JOINED"); }
    else if (message.type === "SIGNAL") resources.current.peer?.accept(message.payload).catch(() => fail("ICE_FAILED"));
    else if (message.type === "PEER_LEFT") fail("PEER_DISCONNECTED");
    else if (message.type === "SESSION_ERROR") fail(message.code);
  }
  async function approve() {
    if (!session || !resources.current.socket || resources.current.socket.readyState !== WebSocket.OPEN) return;
    setState("NEGOTIATING"); resources.current.socket.send(JSON.stringify({ type: "APPROVE_RECEIVER" } satisfies SignalingMessage));
    const peer = new PeerSession(true, session.iceServers, { sendSignal: message => resources.current.socket?.send(JSON.stringify(message)), onChannel: setupSenderChannel, onState: value => { if (value === "failed") fail("ICE_FAILED"); else if (value === "disconnected" || value === "closed") fail("PEER_DISCONNECTED"); } }); resources.current.peer = peer;
    try { await peer.start(); } catch { fail("ICE_FAILED"); }
  }
  function setupSenderChannel(channel: RTCDataChannel) {
    resources.current.channel = channel; channel.binaryType = "arraybuffer";
    channel.onopen = async () => { if (!file) return; setConnection(await resources.current.peer?.connectionKind() ?? "unknown"); setState("CONNECTED"); const transferId = createTransferId(); channel.datasetTransferId = transferId;
      channel.send(encodeControl({ v: 1, type: "META", transferId, file: { name: file.name, size: file.size, mimeType: file.type || "application/octet-stream" }, chunkSize: CHUNK_SIZE, totalChunks: Math.ceil(file.size / CHUNK_SIZE), hash: "sha-256" })); setState("WAITING_RECEIVER_ACCEPT"); };
    channel.onmessage = event => { if (typeof event.data !== "string") return; try { handleSenderControl(decodeControl(event.data)); } catch { fail("PROTOCOL_ERROR"); } };
    channel.onerror = () => fail("PEER_DISCONNECTED");
  }
  function handleSenderControl(message: ControlMessage) {
    if (message.type === "ACCEPT") { setState("READY"); void startSending(message.transferId); }
    else if (message.type === "REJECT") fail("RECEIVER_REJECTED");
    else if (message.type === "RECEIVE_ACK") { ackRef.current.filter(item => item.chunk <= message.contiguousChunk).forEach(item => item.resolve()); ackRef.current = ackRef.current.filter(item => item.chunk > message.contiguousChunk); updateProgress(message.receivedBytes, file?.size ?? 0); }
    else if (message.type === "COMPLETE_ACK") { if (file && message.size === file.size && message.sha256 === expectedHashRef.current) { setMetrics(current => ({ ...current, bytes: file.size, progress: 100, etaSeconds: 0 })); setState("COMPLETED"); } else fail("PROTOCOL_ERROR"); }
    else if (message.type === "ERROR") fail(message.code);
  }
  async function startSending(transferId: string) {
    const channel = resources.current.channel; if (!file || !channel) return; const abort = new AbortController(); resources.current.abort = abort; const hash = sha256.create(); samplesRef.current = []; setState("TRANSFERRING"); channel.send(encodeControl({ v: 1, type: "START", transferId }));
    try { await sendFileChunks(file, channel, transferId, abort.signal, value => updateProgress(value.bytes, file.size), chunk => new Promise(resolve => ackRef.current.push({ chunk, resolve })), bytes => hash.update(bytes)); expectedHashRef.current = bytesToHex(hash.digest()); setState("VERIFYING"); channel.send(encodeControl({ v: 1, type: "END", transferId, size: file.size, sha256: expectedHashRef.current })); }
    catch (reason) { if (!(reason instanceof DOMException && reason.name === "AbortError")) fail("FILE_READ_FAILED"); }
  }
  function updateProgress(bytes: number, total: number) { const now = Date.now(); samplesRef.current.push({ at: now, bytes }); samplesRef.current = samplesRef.current.filter(sample => now - sample.at <= 5000); if (now - lastUiRef.current >= 250 || bytes === total) { lastUiRef.current = now; setMetrics(calculateMetrics(samplesRef.current, bytes, total, now)); } }
  function fail(code: TransferErrorCode) { setError(code); setState(code === "SESSION_EXPIRED" ? "EXPIRED" : "FAILED"); cleanup(); }
  function cancel() { resources.current.channel?.send(encodeControl({ v: 1, type: "CANCEL", transferId: resources.current.channel.datasetTransferId ?? "", reason: "user" })); resources.current.socket?.send(JSON.stringify({ type: "CANCEL_SESSION" } satisfies SignalingMessage)); cleanup(); setState("CANCELLED"); }
  function reset() { cleanup(); setFile(null); setSession(null); setReceiver(""); setMetrics(emptyMetrics); setError(null); setState("IDLE"); if (inputRef.current) inputRef.current.value = ""; }
  async function copyLink() { if (!shareUrl) return; try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* Visible URL remains selectable fallback. */ } }

  return <div className="space-y-5">
    {!SIGNALING_URL ? <Notice tone="warning">{t("serviceSetup")}</Notice> : null}
    {error && !session ? <Status state={state} error={error}/> : null}
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
      <div onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }} className={`grid min-h-56 place-items-center rounded-2xl border-2 border-dashed p-6 text-center ${dragging ? "border-[var(--primary)] bg-[var(--info-bg)]" : "border-[var(--border)] bg-[var(--surface-muted)]"}`}>
        <div><FileUp aria-hidden className="mx-auto size-10 text-[var(--primary)]"/><h2 className="mt-3 text-xl font-bold">{t("dropTitle")}</h2><p className="mt-2 text-sm text-[var(--text-muted)]">{t("dropOr")}</p><Button className="mt-4" onClick={() => inputRef.current?.click()}>{t("choose")}</Button><input ref={inputRef} className="sr-only" type="file" onChange={event => selectFile(event.target.files?.[0])}/><p className="mt-3 text-xs text-[var(--text-muted)]">{t("notStored")}</p></div>
      </div>
      {file ? <div className="mt-5 rounded-2xl border border-[var(--border)] p-4"><div className="break-all font-bold">{file.name}</div><div className="mt-1 text-sm text-[var(--text-muted)]">{formatBytes(file.size)} · {file.type || t("unknownType")}</div>{isPotentiallyDangerousFileName(file.name) ? <Notice tone="warning">{t("dangerous")}</Notice> : null}<div className="mt-4 flex flex-wrap gap-2">{state === "FILE_SELECTED" || state === "FAILED" ? <Button onClick={createSession} disabled={!SIGNALING_URL}>{t("createLink")}</Button> : null}<Button variant="secondary" onClick={reset}>{t("chooseAnother")}</Button></div></div> : null}
    </section>
    {session ? <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"><div className="grid gap-6 md:grid-cols-[auto_1fr]"><div className="text-center"><canvas ref={qrRef} width={256} height={256} aria-label={t("qrLabel")} className="mx-auto size-56 rounded-xl bg-white p-2 sm:size-64"/><div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold"><QrCode size={17}/>{t("scan")}</div></div><div className="min-w-0"><Status state={state} error={error}/><label className="mt-4 block text-sm font-bold">{t("shareUrl")}</label><div className="mt-1 flex flex-col gap-2 sm:flex-row"><input readOnly value={shareUrl} className="control min-w-0 flex-1" onFocus={event => event.currentTarget.select()}/><Button className="shrink-0 whitespace-nowrap sm:min-w-32" onClick={copyLink} aria-label={t("copy")}><Copy size={18}/>{copied ? t("copied") : t("copy")}</Button></div><Notice tone="warning">{t("keepOpen")}</Notice>{state === "RECEIVER_JOINED" ? <div className="mt-4 rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4"><div className="flex items-center gap-2 font-bold"><Smartphone size={19}/>{receiver}</div><p className="mt-2 text-sm">{t("approvePrompt")}</p><div className="mt-3 flex gap-2"><Button onClick={approve}>{t("approve")}</Button><Button variant="secondary" onClick={cancel}>{t("reject")}</Button></div></div> : null}<Progress metrics={metrics} connection={connection}/>{!(["COMPLETED","CANCELLED","EXPIRED"].includes(state)) ? <Button variant="secondary" className="mt-4" onClick={cancel}>{t("cancel")}</Button> : <Button className="mt-4" onClick={reset}>{t("sendAnother")}</Button>}</div></div></section> : null}
  </div>;
}

function Receiver({ sessionId }: { sessionId: string }) {
  const t = useTranslations("Tools.p2pFileTransfer"); const resources = useRef<CommonResources>({ socket: null, peer: null, channel: null, abort: null }), writerRef = useRef<FileSystemWritableFileStream | null>(null), chunksRef = useRef<BlobPart[]>([]), hashRef = useRef(sha256.create()), nextChunkRef = useRef(0), receivedBytesRef = useRef(0), metadataRef = useRef<SafeFileMetadata | null>(null), transferIdRef = useRef(""), writeQueueRef = useRef(Promise.resolve()), samplesRef = useRef<SpeedSample[]>([]);
  const validSession = Boolean(SIGNALING_URL) && isSessionId(sessionId);
  const [state, setState] = useState<TransferState>(validSession ? "WAITING_FOR_RECEIVER" : "FAILED"), [metadata, setMetadata] = useState<SafeFileMetadata | null>(null), [metrics, setMetrics] = useState(emptyMetrics), [error, setError] = useState<TransferErrorCode | null>(validSession ? null : "SESSION_NOT_FOUND"), [connection, setConnection] = useState<"unknown" | "direct" | "relay">("unknown");
  const cleanup = useCallback(() => { resources.current.abort?.abort(); resources.current.channel?.close(); resources.current.peer?.close(); resources.current.socket?.close(); resources.current = { socket: null, peer: null, channel: null, abort: null }; if (writerRef.current) void writerRef.current.abort().catch(() => undefined); writerRef.current = null; }, []);
  const fail = useCallback((code: TransferErrorCode) => { setError(code); setState(code === "SESSION_EXPIRED" ? "EXPIRED" : "FAILED"); cleanup(); }, [cleanup]);
  useEffect(() => { if (!shouldWarnBeforeUnload(state)) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [state]);

  function handleReceiverSignal(message: SignalingMessage, servers: RTCIceServer[]) {
    if (message.type === "APPROVE_RECEIVER") { setState("NEGOTIATING"); const peer = new PeerSession(false, servers, { sendSignal: value => resources.current.socket?.send(JSON.stringify(value)), onChannel: setupReceiverChannel, onState: value => { if (value === "failed") fail("ICE_FAILED"); else if (value === "disconnected" || value === "closed") fail("PEER_DISCONNECTED"); } }); resources.current.peer = peer; }
    else if (message.type === "REJECT_RECEIVER") fail("RECEIVER_REJECTED");
    else if (message.type === "SIGNAL") resources.current.peer?.accept(message.payload).catch(() => fail("ICE_FAILED"));
    else if (message.type === "PEER_LEFT") fail(message.role === "sender" ? "SENDER_OFFLINE" : "PEER_DISCONNECTED");
    else if (message.type === "SESSION_ERROR") fail(message.code);
  }
  function setupReceiverChannel(channel: RTCDataChannel) { resources.current.channel = channel; channel.binaryType = "arraybuffer"; channel.onopen = async () => { setState("CONNECTED"); setConnection(await resources.current.peer?.connectionKind() ?? "unknown"); };
    channel.onmessage = event => { if (typeof event.data === "string") { try { void handleReceiverControl(decodeControl(event.data)).catch(() => fail("PROTOCOL_ERROR")); } catch { fail("PROTOCOL_ERROR"); } } else if (event.data instanceof ArrayBuffer) receiveChunk(event.data); };
    channel.onerror = () => fail("PEER_DISCONNECTED");
  }
  useEffect(() => { if (!validSession) return; let alive = true;
    fetch(`${SIGNALING_URL}/v1/sessions/${sessionId}/ice`, { method: "POST" }).then(async response => { if (!response.ok) throw new Error(); const value = await response.json() as { iceServers: RTCIceServer[] }; if (!alive) return; const wsUrl = SIGNALING_URL.replace(/^http/, "ws") + `/s/${sessionId}`; resources.current.socket = openSignaling(wsUrl, { type: "JOIN_RECEIVER", device: coarseDeviceLabel(navigator.userAgent) }, message => handleReceiverSignal(message, value.iceServers)); }).catch(() => alive && fail("SESSION_NOT_FOUND")); return () => { alive = false; cleanup(); };
  // The signaling handlers intentionally live for one session connection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, validSession, cleanup, fail]);
  async function handleReceiverControl(message: ControlMessage) {
    if (message.type === "META") { if (message.chunkSize !== CHUNK_SIZE || message.file.size < 0 || message.file.size > FULL_RECEIVER_LIMIT || message.file.name.length > 255) { fail("PROTOCOL_ERROR"); return; } metadataRef.current = message.file; transferIdRef.current = message.transferId; receivedBytesRef.current = 0; setMetadata(message.file); setMetrics({ ...emptyMetrics, total: message.file.size }); setState("WAITING_RECEIVER_ACCEPT"); }
    else if (message.type === "START") { if (message.transferId !== transferIdRef.current) fail("PROTOCOL_ERROR"); else setState("TRANSFERRING"); }
    else if (message.type === "END") { await finishReceive(message); }
    else if (message.type === "CANCEL") { setState("CANCELLED"); cleanup(); }
  }
  async function acceptFile() {
    const file = metadataRef.current, channel = resources.current.channel; if (!file || !channel) return;
    let mode: "stream" | "blob" = "blob";
    try {
      if ("showSaveFilePicker" in window) { const handle = await window.showSaveFilePicker({ suggestedName: sanitizeFileName(file.name) }); writerRef.current = await handle.createWritable(); mode = "stream"; }
      else if (file.size > LIMITED_RECEIVER_LIMIT) { fail("FILE_TOO_LARGE_FOR_BROWSER"); return; }
    } catch { return; }
    chunksRef.current = []; hashRef.current = sha256.create(); nextChunkRef.current = 0; receivedBytesRef.current = 0; setState("READY"); channel.send(encodeControl({ v: 1, type: "ACCEPT", transferId: transferIdRef.current, saveMode: mode }));
  }
  function receiveChunk(frame: ArrayBuffer) { const file = metadataRef.current, channel = resources.current.channel; if (!file || !channel) { fail("PROTOCOL_ERROR"); return; }
    try { const decoded = decodeChunk(frame, CHUNK_SIZE); if (decoded.transferId !== transferIdRef.current || decoded.chunkIndex !== nextChunkRef.current || receivedBytesRef.current + decoded.payload.byteLength > file.size) { fail("PROTOCOL_ERROR"); return; } const payload = decoded.payload.slice(), chunkIndex = nextChunkRef.current; nextChunkRef.current++;
      writeQueueRef.current = writeQueueRef.current.then(async () => { hashRef.current.update(payload); if (writerRef.current) await writerRef.current.write(payload); else chunksRef.current.push(payload); receivedBytesRef.current += payload.byteLength; const bytes = receivedBytesRef.current, now = Date.now(); samplesRef.current.push({ at: now, bytes }); samplesRef.current = samplesRef.current.filter(sample => now - sample.at <= 5000); if ((chunkIndex + 1) % ACK_WINDOW_CHUNKS === 0 || bytes === file.size) channel.send(encodeControl({ v: 1, type: "RECEIVE_ACK", transferId: transferIdRef.current, receivedBytes: bytes, contiguousChunk: chunkIndex })); setMetrics(calculateMetrics(samplesRef.current, bytes, file.size, now)); }).catch(() => fail("DISK_WRITE_FAILED"));
    } catch { fail("PROTOCOL_ERROR"); }
  }
  async function finishReceive(message: Extract<ControlMessage, { type: "END" }>) { setState("VERIFYING"); try { await writeQueueRef.current; const file = metadataRef.current; if (!file || message.transferId !== transferIdRef.current || message.size !== file.size || receivedBytesRef.current !== file.size) throw new Error("size"); const digest = bytesToHex(hashRef.current.digest()); if (digest !== message.sha256) { fail("HASH_MISMATCH"); return; }
      if (writerRef.current) { await writerRef.current.close(); writerRef.current = null; } else { const blob = new Blob(chunksRef.current, { type: file.mimeType }); if (blob.size !== file.size) throw new Error("size"); const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = sanitizeFileName(file.name); link.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
      resources.current.channel?.send(encodeControl({ v: 1, type: "COMPLETE_ACK", transferId: transferIdRef.current, size: file.size, sha256: digest })); setMetrics(current => ({ ...current, bytes: file.size, progress: 100, etaSeconds: 0 })); setState("COMPLETED");
    } catch { fail("DISK_WRITE_FAILED"); } }
  function cancel() { resources.current.channel?.send(encodeControl({ v: 1, type: "CANCEL", transferId: transferIdRef.current, reason: "user" })); cleanup(); setState("CANCELLED"); }

  return <section className="mx-auto max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-8"><div className="text-center"><Smartphone aria-hidden className="mx-auto size-10 text-[var(--primary)]"/><h1 className="mt-3 text-2xl font-bold">{t("receiveTitle")}</h1></div><Status state={state} error={error}/>{metadata ? <div className="mt-5 rounded-2xl bg-[var(--surface-muted)] p-5"><div className="break-all text-lg font-bold">{metadata.name}</div><div className="mt-1 text-sm text-[var(--text-muted)]">{formatBytes(metadata.size)} · {metadata.mimeType}</div>{isPotentiallyDangerousFileName(metadata.name) ? <Notice tone="warning">{t("dangerous")}</Notice> : null}{state === "WAITING_RECEIVER_ACCEPT" ? <Button className="mt-5 w-full" onClick={acceptFile}>{t("receive")}</Button> : null}</div> : <p className="mt-5 text-center text-[var(--text-muted)]">{t("waitingSender")}</p>}<Progress metrics={metrics} connection={connection}/>{shouldWarnBeforeUnload(state) ? <Button variant="secondary" className="mt-5 w-full" onClick={cancel}>{t("cancel")}</Button> : null}</section>;
}

function Status({ state, error }: { state: TransferState; error: TransferErrorCode | null }) { const t = useTranslations("Tools.p2pFileTransfer"); const done = state === "COMPLETED", failed = state === "FAILED" || state === "EXPIRED"; return <div role={failed ? "alert" : "status"} aria-live="polite" className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${failed ? "bg-[var(--error-bg)] text-[var(--error-fg)]" : done ? "bg-[var(--success-bg)] text-[var(--success-fg)]" : "bg-[var(--info-bg)] text-[var(--info-fg)]"}`}>{failed ? <XCircle aria-hidden size={19}/> : done ? <CheckCircle2 aria-hidden size={19}/> : <LoaderCircle aria-hidden size={19} className={state.includes("ING") ? "animate-spin" : ""}/>}<span>{error ? t(`errors.${error}`) : t(`states.${state}`)}</span></div>; }
function Progress({ metrics, connection }: { metrics: TransferMetrics; connection: "unknown" | "direct" | "relay" }) { const t = useTranslations("Tools.p2pFileTransfer"); if (!metrics.total && !metrics.progress) return null; return <div className="mt-5"><div className="flex justify-between text-sm font-semibold"><span>{formatBytes(metrics.bytes)} / {formatBytes(metrics.total)}</span><span>{metrics.progress.toFixed(1)}%</span></div><progress className="mt-2 h-3 w-full accent-blue-600" max={100} value={metrics.progress}>{metrics.progress}%</progress><div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] sm:grid-cols-3"><span>{metrics.bytesPerSecond ? `${formatBytes(metrics.bytesPerSecond)}/s` : t("calculating")}</span><span>{metrics.etaSeconds !== null ? t("eta", { seconds: Math.ceil(metrics.etaSeconds) }) : t("calculating")}</span><span>{connection === "unknown" ? t("connecting") : t(`connection.${connection}`)}</span></div></div>; }
function Notice({ children, tone }: { children: React.ReactNode; tone: "warning" | "info" }) { return <div className={`mt-4 rounded-xl p-3 text-sm leading-6 ${tone === "warning" ? "bg-[var(--warning-bg)] text-[var(--warning-fg)]" : "bg-[var(--info-bg)] text-[var(--info-fg)]"}`}><ShieldCheck aria-hidden className="mr-2 inline" size={17}/>{children}</div>; }

declare global { interface RTCDataChannel { datasetTransferId?: string } interface Window { showSaveFilePicker(options?: { suggestedName?: string }): Promise<FileSystemFileHandle> } }
