/** Bounded JSON snapshots. Self-contained: also serialized into the Preview's early script. */
export function snapshotConsoleArgs(args: unknown[]): string {
  let remaining = 1500;
  let characters = 64000;
  const ancestors = new WeakSet<object>();
  const text = (value: string) => {
    const size = Math.max(0, Math.min(4000, characters));
    const clipped = value.slice(0, size);
    characters -= clipped.length;
    return value.length > size ? `${clipped}… [truncated]` : value;
  };
  const visit = (value: unknown, depth: number): unknown => {
    if (--remaining < 0 || characters <= 0) return "[Truncated]";
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "string") return text(value);
    if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
    if (typeof value === "bigint") return text(`${value}n`);
    if (typeof value === "undefined") return "[undefined]";
    if (typeof value === "symbol") return text(String(value));
    if (typeof value === "function") return "[Function]";
    const object = value as object;
    if (ancestors.has(object)) return "[Circular]";
    if (depth >= 8) return "[Max depth]";
    ancestors.add(object);
    try {
      const array = Array.isArray(object);
      const result: Record<string, unknown> | unknown[] = array ? [] : Object.create(null);
      let count = 0;
      // Descriptors avoid invoking getters (including toJSON). Proxies may throw: report that below.
      for (const key in object) {
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (!descriptor) continue;
        if (count++ >= 100 || remaining <= 0 || characters <= 0) {
          if (array) (result as unknown[]).push("[Truncated]");
          else (result as Record<string, unknown>)["…"] = "[Truncated]";
          break;
        }
        const child = "value" in descriptor ? visit(descriptor.value, depth + 1) : "[Getter/Setter]";
        if (array) (result as unknown[]).push(child);
        else (result as Record<string, unknown>)[text(key)] = child;
      }
      if (object instanceof Error) {
        for (const key of ["message", "stack"]) {
          const descriptor = Object.getOwnPropertyDescriptor(object, key);
          if (descriptor && "value" in descriptor) (result as Record<string, unknown>)[key] = visit(descriptor.value, depth + 1);
        }
      }
      return result;
    } catch {
      return "[Uninspectable]";
    } finally {
      ancestors.delete(object);
    }
  };
  const values = args.slice(0, args.length > 20 ? 19 : 20).map((arg) => visit(arg, 0));
  if (args.length > 20) values.push("[Truncated arguments]");
  return JSON.stringify(values);
}

/** Self-contained hook; the original console still receives the original arguments. */
function installPreviewConsole(snapshot: typeof snapshotConsoleArgs): void {
  if (parent === window || new URLSearchParams(location.search).get("target") !== "iframe") return;
  parent.postMessage({ type: "ics:console-reset" }, location.origin);
  for (const level of ["log", "info", "warn", "error"] as const) {
    const original = console[level];
    console[level] = function (...args: unknown[]) {
      original.apply(console, args);
      try {
        parent.postMessage({ type: "ics:console", level, args: snapshot(args), time: Date.now() }, location.origin);
      } catch {
        // Inspection must never interrupt tutorial code.
      }
    };
  }
}

/** Both functions deliberately contain no module references: they run in the iframe's realm. */
export const consoleCaptureScript = () => `<script>(${installPreviewConsole.toString()})(${snapshotConsoleArgs.toString()})</script>`;
