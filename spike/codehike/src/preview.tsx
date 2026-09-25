import { useEffect, useMemo, useState } from "react";
import { applyVars } from "../../shared/markers.ts";
import { buildPreviewHtml, storePreview } from "../../shared/preview.ts";
import { files } from "./files.ts";
import { useVars } from "./vars.tsx";

// Same origin is required: the SDK's oauth-callback.html talks to window.opener.
const SANDBOX =
  new URLSearchParams(location.search).get("sandbox") ?? "allow-scripts allow-popups allow-forms allow-same-origin";

export function usePreviewHtml(): string {
  const { values } = useVars();
  return useMemo(
    () => buildPreviewHtml(Object.fromEntries(files.map((f) => [f.path, applyVars(f.parsed, values)]))),
    [values],
  );
}

export function Preview({ open }: { open: boolean }) {
  const html = usePreviewHtml();
  const [src, setSrc] = useState<string>();
  // Bumped on every stored change and on Run, to remount (reload) the iframe.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSrc(storePreview(html, "iframe", "./preview.html"));
      setVersion((v) => v + 1);
    }, 500);
    return () => clearTimeout(t);
  }, [html]);

  if (!open) return null;
  return (
    <div className="preview">
      <div className="preview-toolbar">
        <calcite-button appearance="transparent" iconStart="refresh" onClick={() => setVersion((v) => v + 1)}>
          Run
        </calcite-button>
        <calcite-button
          appearance="transparent"
          iconStart="launch"
          onClick={() => window.open(storePreview(html, "tab", "./preview.html"), "_blank")}
        >
          Open in new tab
        </calcite-button>
      </div>
      {src && <iframe key={version} title="Preview" sandbox={SANDBOX} src={src} />}
    </div>
  );
}
