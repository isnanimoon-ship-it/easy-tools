"use client";

/* eslint-disable @next/next/no-img-element -- CDN natural dimensions are the feature's availability signal. */

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseYouTubeInput, type YouTubeInputError } from "@/lib/tools/youtube-thumbnail-downloader/parse-youtube-input";
import { createThumbnailUrl, isUsableThumbnail, THUMBNAIL_VARIANTS, type ThumbnailKey, type ThumbnailVariant } from "@/lib/tools/youtube-thumbnail-downloader/thumbnails";

type LoadResult = { width: number; height: number; loaded: boolean };
type CardState = { variant: ThumbnailVariant; url: string; status: "pending" | "available" | "unavailable"; width: number; height: number };
type UiError = Exclude<YouTubeInputError, "empty"> | "thumbnail-unavailable" | "network";

export type YouTubeThumbnailLabels = {
  inputLabel: string; inputHelp: string; placeholder: string; extract: string; clear: string; loading: string;
  videoId: string; available: string; unavailable: string; resolution: string; open: string; save: string; saving: string;
  saved: string; saveError: string; errors: Record<UiError, string>; variants: Record<ThumbnailKey, string>;
};

export type ImageLoader = (url: string, timeoutMs: number) => Promise<LoadResult>;

export function loadThumbnailImage(url: string, timeoutMs: number): Promise<LoadResult> {
  const workerSource = `self.onmessage=async(e)=>{try{const r=await fetch(e.data);if(!r.ok||!(r.headers.get('content-type')||'').toLowerCase().startsWith('image/')){self.postMessage({ok:false});return}const b=await r.blob();const a=await b.arrayBuffer();self.postMessage({ok:true,type:b.type,data:a},[a])}catch{self.postMessage({ok:false})}}`;
  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  const worker = new Worker(workerUrl);
  return new Promise<LoadResult>((resolve) => {
    let settled = false;
    const finish = (result: LoadResult) => {
      if (settled) return;
      settled = true; clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(workerUrl); resolve(result);
    };
    const timer = window.setTimeout(() => finish({ width: 0, height: 0, loaded: false }), timeoutMs);
    worker.onerror = () => finish({ width: 0, height: 0, loaded: false });
    worker.onmessage = (event: MessageEvent<{ ok: boolean; type?: string; data?: ArrayBuffer }>) => {
      if (!event.data.ok || !event.data.data) { finish({ width: 0, height: 0, loaded: false }); return; }
      const imageUrl = URL.createObjectURL(new Blob([event.data.data], { type: event.data.type }));
      const image = new Image();
      const finishImage = (result: LoadResult) => { image.onload = null; image.onerror = null; URL.revokeObjectURL(imageUrl); finish(result); };
      image.onload = () => finishImage({ width: image.naturalWidth, height: image.naturalHeight, loaded: true });
      image.onerror = () => finishImage({ width: 0, height: 0, loaded: false }); image.src = imageUrl;
    };
    worker.postMessage(url);
  });
}

export function YouTubeThumbnailDownloader({ labels, imageLoader = loadThumbnailImage }: { labels: YouTubeThumbnailLabels; imageLoader?: ImageLoader }) {
  const [input, setInput] = useState("");
  const [videoId, setVideoId] = useState("");
  const [cards, setCards] = useState<CardState[]>([]);
  const [error, setError] = useState<UiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<ThumbnailKey | null>(null);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const requestToken = useRef(0);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => () => {
    requestToken.current += 1;
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);

  function invalidate() {
    requestToken.current += 1;
    setVideoId(""); setCards([]); setError(null); setLoading(false); setSaving(null); setStatus("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseYouTubeInput(input);
    if (!parsed.ok) {
      invalidate();
      if (parsed.reason !== "empty") setError(parsed.reason);
      return;
    }

    const token = requestToken.current + 1;
    requestToken.current = token;
    const initial = THUMBNAIL_VARIANTS.map((variant) => ({ variant, url: createThumbnailUrl(parsed.videoId, variant.filename), status: "pending" as const, width: 0, height: 0 }));
    setVideoId(parsed.videoId); setCards(initial); setError(null); setLoading(true); setStatus("");

    const settled = await Promise.all(initial.map(async (card): Promise<CardState> => {
      const result = await imageLoader(card.url, 10_000).catch(() => ({ width: 0, height: 0, loaded: false }));
      return { ...card, width: result.width, height: result.height, status: result.loaded && isUsableThumbnail(card.variant, result.width, result.height) ? "available" : "unavailable" };
    }));
    if (requestToken.current !== token) return;
    const hqAvailable = settled.find((card) => card.variant.key === "hq")?.status === "available";
    setCards(settled); setLoading(false);
    if (!hqAvailable) setError(settled.every((card) => card.width === 0) ? "network" : "thumbnail-unavailable");
  }

  function clear() { invalidate(); setInput(""); queueMicrotask(() => inputRef.current?.focus()); }

  async function save(card: CardState) {
    if (saving) return;
    setSaving(card.variant.key); setStatus("");
    try {
      const response = await fetch(card.url);
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/")) throw new Error("Invalid image response");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.current.add(objectUrl);
      const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = `youtube-${videoId}-${card.variant.key}.jpg`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(objectUrl); objectUrls.current.delete(objectUrl);
      setStatus(labels.saved);
    } catch { setStatus(labels.saveError); }
    finally { setSaving(null); }
  }

  const hasInput = input.trim().length > 0;
  const errorId = error ? "youtube-thumbnail-error" : undefined;
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <form onSubmit={submit}>
      <label htmlFor="youtube-url" className="font-bold text-slate-950">{labels.inputLabel}</label>
      <p id="youtube-url-help" className="mt-1 text-sm leading-6 text-slate-600">{labels.inputHelp}</p>
      <input id="youtube-url" ref={inputRef} value={input} disabled={loading} onChange={(event) => { setInput(event.target.value); invalidate(); }} aria-describedby={["youtube-url-help", errorId].filter(Boolean).join(" ")} aria-invalid={Boolean(error) || undefined} placeholder={labels.placeholder} spellCheck={false} inputMode="url" autoComplete="url" className="mt-3 min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-wait" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:flex">
        <Button type="submit" disabled={!hasInput || loading}>{loading ? labels.loading : labels.extract}</Button>
        <Button variant="secondary" onClick={clear} disabled={!input && !videoId && !error}>{labels.clear}</Button>
      </div>
    </form>

    {error ? <p id="youtube-thumbnail-error" role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-900">{labels.errors[error]}</p> : null}
    {videoId ? <div className="mt-7 border-t border-slate-200 pt-6">
      <p className="break-all text-sm text-slate-600"><strong className="text-slate-950">{labels.videoId}:</strong> <code>{videoId}</code></p>
      {loading ? <p role="status" className="mt-4 font-semibold text-blue-800">{labels.loading}</p> : null}
      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <article key={card.variant.key} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {card.status === "available" ? <img src={card.url} alt="" width={card.width} height={card.height} decoding="async" className="aspect-video w-full bg-slate-200 object-contain" /> : <div className="grid aspect-video place-items-center bg-slate-100 px-4 text-center text-sm font-medium text-slate-500">{card.status === "pending" ? labels.loading : labels.unavailable}</div>}
          <div className="p-4"><h2 className="font-bold text-slate-950">{labels.variants[card.variant.key]}</h2>
            <p className="mt-1 text-sm text-slate-600">{card.status === "available" ? `${labels.resolution}: ${card.width} × ${card.height}` : card.status === "pending" ? labels.loading : labels.unavailable}</p>
            {card.status === "available" ? <div className="mt-4 flex flex-wrap gap-2">
              <a href={card.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"><ExternalLink aria-hidden="true" size={17} />{labels.open}</a>
              <Button variant="secondary" className="text-sm" onClick={() => void save(card)} disabled={saving !== null}><Download aria-hidden="true" size={17} />{saving === card.variant.key ? labels.saving : labels.save}</Button>
            </div> : null}
          </div>
        </article>)}
      </div>
    </div> : null}
    {status ? <p role="status" className={`mt-4 text-sm font-semibold ${status === labels.saved ? "text-emerald-700" : "text-red-800"}`}>{status}</p> : null}
  </section>;
}
