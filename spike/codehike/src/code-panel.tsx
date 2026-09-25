import { useEffect, useLayoutEffect, useState } from "react";
import {
  getPreRef,
  highlight,
  InnerLine,
  InnerPre,
  Pre,
  type AnnotationHandler,
  type HighlightedCode,
} from "codehike/code";
import { applyVars } from "../../shared/markers.ts";
import { files, imageUrls } from "./files.ts";
import type { StepMeta } from "./steps.tsx";
import { useVars } from "./vars.tsx";

const focus: AnnotationHandler = {
  name: "focus",
  onlyIfAnnotated: true,
  PreWithRef: (props) => {
    const ref = getPreRef(props);
    useLayoutEffect(() => {
      ref.current?.querySelector("[data-focus]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return <InnerPre merge={props} />;
  },
  Line: (props) => <InnerLine merge={props} className="line" />,
  AnnotatedLine: ({ annotation: _annotation, ...props }) => (
    <InnerLine merge={props} data-focus={true} className="line line-focus" />
  ),
};

export function CodePanel({ step }: { step: StepMeta | undefined }) {
  const { display } = useVars();
  const [manualFile, setManualFile] = useState<string | undefined>();
  const [highlighted, setHighlighted] = useState<{ path: string; code: HighlightedCode } | undefined>();

  // A new step resets manual tab selection.
  useEffect(() => setManualFile(undefined), [step?.id]);

  const activePath = manualFile ?? step?.file ?? files[0]!.path;
  const file = files.find((f) => f.path === activePath);
  if (!file) throw new Error(`Step "${step?.id}" references missing file "${activePath}"`);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    void highlight({ value: applyVars(file.parsed, display), lang: file.lang, meta: "" }, "github-from-css").then(
      (h) => {
        if (cancelled) return;
        console.debug(`[codehike] highlight ${file.path}: ${(performance.now() - t0).toFixed(1)} ms`);
        setHighlighted({ path: file.path, code: h });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [file, display]);

  const region =
    step?.region && step.file === file.path ? file.parsed.regions.find((r) => r.id === step.region) : undefined;
  if (step?.region && step.file === file.path && !region) {
    throw new Error(`Step "${step.id}" references missing region "${step.region}" in ${file.path}`);
  }

  if (step?.images?.length) {
    return (
      <calcite-carousel label="Step images" arrowType="edge">
        {step.images.map((name) => (
          <calcite-carousel-item key={name} label={name}>
            <img src={imageUrls[name]} alt={name} className="step-image" />
          </calcite-carousel-item>
        ))}
      </calcite-carousel>
    );
  }

  const code: HighlightedCode | undefined = highlighted?.path === file.path ? {
    ...highlighted.code,
    annotations: region
      ? [{ name: "focus", query: "", fromLineNumber: region.fromLine, toLineNumber: region.toLine }]
      : [],
  } : undefined;

  return (
    <div className="code-panel">
      <calcite-tab-nav>
        {files.map((f) => (
          <calcite-tab-title key={f.path} selected={f.path === activePath} oncalciteTabsActivate={() => setManualFile(f.path)}>
            {f.path}
          </calcite-tab-title>
        ))}
      </calcite-tab-nav>
      {code && <Pre code={code} handlers={[focus]} className="code" data-file={file.path} />}
    </div>
  );
}
