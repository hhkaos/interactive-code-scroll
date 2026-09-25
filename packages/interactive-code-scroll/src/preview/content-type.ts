const TYPES: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  json: "application/json",
  svg: "image/svg+xml",
  txt: "text/plain",
  md: "text/markdown",
};

export function contentType(path: string): string {
  const type = TYPES[path.split(".").pop()!.toLowerCase()] ?? "text/plain";
  return `${type}; charset=utf-8`;
}
