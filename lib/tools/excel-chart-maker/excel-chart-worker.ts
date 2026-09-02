/// <reference lib="webworker" />
import { parseWorkbookBuffer } from "./file";

type Request = { id: number; buffer: ArrayBuffer; fileName: string; fileSize: number; sheet?: string };
self.onmessage = (event: MessageEvent<Request>) => {
  const { id, buffer, fileName, fileSize, sheet } = event.data;
  try { self.postMessage({ id, ok: true, payload: parseWorkbookBuffer(buffer, fileName, fileSize, sheet) }); }
  catch (error) { self.postMessage({ id, ok: false, code: error && typeof error === "object" && "code" in error ? error.code : "parse" }); }
};

