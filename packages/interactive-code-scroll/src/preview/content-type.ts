import { extensionOf } from "../file-types.ts";

const TEXT: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  json: "application/json",
  geojson: "application/geo+json",
  svg: "image/svg+xml",
  txt: "text/plain",
  md: "text/markdown",
  xml: "application/xml",
};

const BINARY: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  pdf: "application/pdf",
  zip: "application/zip",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  wasm: "application/wasm",
};

/** Text files (and unknown text) carry a UTF-8 charset; binaries default to octet-stream. */
export function contentType(path: string, binary = false): string {
  const ext = extensionOf(path);
  if (binary) return BINARY[ext] ?? "application/octet-stream";
  return `${TEXT[ext] ?? "text/plain"}; charset=utf-8`;
}
