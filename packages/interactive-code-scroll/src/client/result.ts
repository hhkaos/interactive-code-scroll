import { outputKind } from "../output.ts";
import { PREVIEW_ENTRY } from "../preview/build-html.ts";
import type { RunnerRequest } from "../requests.ts";
import { setAction } from "./actions.ts";
import { renderJsonTree } from "./json-tree.ts";
import { parseJson, type JsonValue } from "./json-tree-values.ts";
import { terminalSegments } from "./terminal-values.ts";
import { PREVIEW_STATE_EVENT, type PreviewState } from "./preview.ts";
import { lastResult, stepOutput, stepRequests, type StepResult } from "./result-values.ts";
import {
  displayLine,
  failureMessage,
  resolveRequest,
  responseBadge,
  RUN_TIMEOUT_MS,
  runAsLabels,
  type RunFailure,
} from "./runner-values.ts";
import { STEP_EVENT } from "./steps.ts";
import { VARIANT_EVENT, type VariantsHandle } from "./variants.ts";
import type { VarsHandle } from "./vars.ts";

export interface ResultOptions {
  /** Embedded file paths (relative to `code/`): web code is the one with `index.html`. */
  files: readonly { path: string }[];
  /** URL of the published captured outputs (`<base>output/`). */
  outputUrl: string;
  variants?: VariantsHandle;
  /** Named requests of `requests/`, by name. */
  requests: Readonly<Record<string, RunnerRequest>>;
  vars: VarsHandle;
}

export interface ResultHandle {
  /** Redraws the request line (var values changed). */
  refreshRequest(): void;
}

/** A live response; `body` is untrusted text. */
interface LiveResponse {
  status: number;
  statusText: string;
  ms: number;
  body: string;
}

type CalciteNotice = HTMLElement & { open: boolean };
type SegmentedControl = HTMLElement & { value: string };

/**
 * The Result pane takes the Preview's place for code that cannot run in the browser.
 * Captured outputs and live responses are untrusted text: they are rendered as text
 * nodes (a JSON tree, terminal text or an image), never as HTML.
 *
 * Steps with `request=` can run it live. Run is always explicit; a live response lasts
 * until the pane shows another step, variant or request, unless the reader keeps it
 * (in memory, until the page reloads).
 */
export function startResult({ files, outputUrl, variants, requests, vars }: ResultOptions): ResultHandle {
  const section = document.querySelector<HTMLElement>("section.result");
  if (!section) return { refreshRequest: () => {} };
  const frame = section.querySelector<HTMLElement>(".result-frame")!;
  const body = section.querySelector<HTMLElement>(".result-body")!;
  const badge = section.querySelector<HTMLElement>(".result-badge")!;
  const empty = body.querySelector(".result-empty")!;
  const runAs = section.querySelector<HTMLElement>(".result-run-as")!;
  const runAsControl = section.querySelector<SegmentedControl>("#result-run-as")!;
  const keepButton = section.querySelector<HTMLElement>("#result-keep")!;
  const capturedButton = section.querySelector<HTMLElement>("#result-captured")!;
  const runButton = section.querySelector<HTMLElement>("#result-run")!;
  const requestBar = section.querySelector<HTMLElement>(".result-request")!;
  const requestLine = requestBar.querySelector<HTMLElement>(".result-request-line")!;
  const requestSource = requestBar.querySelector<HTMLElement>(".result-request-source")!;
  const revealButton = requestBar.querySelector<HTMLElement>("#result-reveal")!;
  const notice = section.querySelector<CalciteNotice>("#result-notice")!;
  const noticeMessage = notice.querySelector<HTMLElement>("[slot=message]")!;

  const allSteps = [...document.querySelectorAll<HTMLElement>("section.step")];
  const results: StepResult[] = allSteps.map(({ dataset }) => ({
    output: dataset.output,
    outputs: dataset.outputs ? (JSON.parse(dataset.outputs) as Record<string, string>) : undefined,
    requests: dataset.requests?.split(" "),
    requestVariants: dataset.requestVariants ? (JSON.parse(dataset.requestVariants) as string[]) : undefined,
  }));
  // The pane appears only when some step has an output or a request.
  const used = results.some((s) => s.output || s.outputs || s.requests);

  const isWeb = () => {
    const dir = variants?.active().dir;
    return files.some((f) => f.path === (dir === undefined ? PREVIEW_ENTRY : `${dir}/${PREVIEW_ENTRY}`));
  };

  const texts = new Map<string, Promise<string>>();
  const fetchText = (url: string) => {
    let text = texts.get(url);
    if (!text) {
      text = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      });
      text.catch(() => texts.delete(url));
      texts.set(url, text);
    }
    return text;
  };

  // What the pane shows: the result step (last-result rule), its captured output and requests.
  let active: HTMLElement | null = null;
  let context = "";
  let resultStep = -1;
  let captured: string | undefined;
  let names: readonly string[] = [];
  let chosen: string | undefined;
  // The live response of `chosen` (kept ones survive context changes), or why it failed.
  const kept = new Map<string, LiveResponse>();
  let live: LiveResponse | undefined;
  let failure: RunFailure | undefined;
  let buildError: string | undefined;
  let running = false;
  let abort = () => {};
  let runs = 0;
  let revealed = false;
  let shown: string | undefined;
  let renders = 0;

  const keptKey = () => `${allSteps[resultStep]?.id ?? ""} ${chosen ?? ""}`;
  const isKept = () => live !== undefined && kept.get(keptKey()) === live;

  const text = (className: string, content: string, error = false) => {
    const pre = document.createElement("pre");
    pre.className = className;
    pre.textContent = content;
    if (error) pre.dataset.error = "";
    return pre;
  };

  function renderJson(value: JsonValue, label: string): HTMLElement {
    const viewer = document.createElement("div");
    viewer.className = "result-json";
    viewer.append(renderJsonTree(value, label));
    return viewer;
  }

  function renderTerminal(pre: HTMLElement, content: string): void {
    pre.replaceChildren(
      ...terminalSegments(content).map(({ text: run, classes }) => {
        if (!classes.length) return document.createTextNode(run);
        const span = document.createElement("span");
        span.className = classes.join(" ");
        span.textContent = run;
        return span;
      }),
    );
  }

  /** Replaces the body unless it already shows `key`. */
  function show(key: string, build: () => Node): void {
    if (key === shown) return;
    shown = key;
    renders += 1;
    body.replaceChildren(build());
  }

  function showCaptured(path: string | undefined): void {
    if (path === undefined) return show("empty", () => empty);
    show(`captured:${path}`, () => {
      const token = renders;
      const url = new URL(path.split("/").map(encodeURIComponent).join("/"), new URL(outputUrl, location.href)).href;
      const kind = outputKind(path);
      if (kind === "image") {
        const image = document.createElement("img");
        image.className = "result-image";
        image.alt = `Captured output ${path}`;
        image.src = url;
        return image;
      }
      const pre = document.createElement("pre");
      pre.className = kind === "text" ? "result-terminal" : "result-json";
      pre.setAttribute("aria-busy", "true");
      fetchText(url).then(
        (content) => {
          if (token !== renders) return;
          const json = kind === "json" ? parseJson(content) : undefined;
          if (json?.ok) return pre.replaceWith(renderJson(json.value, `JSON output/${path}`));
          if (kind === "text") renderTerminal(pre, content);
          // JSON that does not parse: shown as it is.
          else pre.textContent = content;
          pre.removeAttribute("aria-busy");
        },
        () => {
          if (token !== renders) return;
          pre.textContent = `Could not load output/${path}.`;
          pre.dataset.error = "";
          pre.removeAttribute("aria-busy");
        },
      );
      return pre;
    });
  }

  function showResponse(response: LiveResponse): void {
    show(`live:${runs}:${keptKey()}`, () => {
      if (response.body === "") return text("result-message", "(empty body)");
      const json = parseJson(response.body);
      if (json.ok) return renderJson(json.value, `JSON response of ${chosen}`);
      return text("result-response", response.body);
    });
  }

  function setBadge(state: string | undefined, label = ""): void {
    badge.hidden = state === undefined;
    badge.textContent = label;
    if (state === undefined) delete badge.dataset.state;
    else badge.dataset.state = state;
  }

  function draw(): void {
    const request = chosen === undefined ? undefined : requests[chosen];
    runButton.hidden = request === undefined;
    runButton.toggleAttribute("loading", running);
    runAs.hidden = names.length < 2;
    keepButton.hidden = live === undefined || isKept();
    capturedButton.hidden = live === undefined;
    notice.open = failure !== undefined;
    noticeMessage.textContent = failure === undefined ? "" : failureMessage(failure, captured !== undefined);
    refreshRequest();

    if (running) {
      setBadge("running", "Sending…");
      const host = request ? new URL(resolveRequest(request, vars.values()).url, location.href).host : "";
      show(`running:${runs}`, () => text("result-message", `Sending request to ${host}…`));
    } else if (buildError !== undefined) {
      setBadge("error", "Request not sent");
      show(`build-error:${runs}`, () => text("result-message", buildError!, true));
    } else if (live) {
      setBadge(live.status >= 200 && live.status < 300 ? "live" : "error", responseBadge(live, isKept()));
      showResponse(live);
    } else {
      setBadge(
        captured === undefined ? undefined : failure ? "fallback" : "captured",
        captured === undefined ? "" : `${failure ? "Captured (fallback)" : "Captured"} · output/${captured}`,
      );
      showCaptured(captured);
    }
  }

  function refreshRequest(): void {
    const request = chosen === undefined ? undefined : requests[chosen];
    requestBar.hidden = request === undefined;
    if (!request) return;
    const line = (reveal: boolean) => displayLine(request, vars.values(), vars.secrets(), reveal);
    // Long URLs wrap at path segments, the query string and each parameter; the method stays with the URL.
    requestLine.replaceChildren(
      ...line(revealed)
        .replace(" ", "\u00a0")
        .split(/(?<=[^/]\/)(?=[^/])|(?=[?&])/)
        .flatMap((part, i) => (i === 0 ? [part] : [document.createElement("wbr"), part])),
    );
    requestSource.textContent = `requests/${request.path} · ${request.name}`;
    // The toggle appears once the line has something masked (or to hide it again).
    revealButton.hidden = !revealed && line(true) === line(false);
  }

  /** Drops the live response and any request in flight; kept responses stay available. */
  function reset(): void {
    abort();
    running = false;
    failure = undefined;
    buildError = undefined;
    live = kept.get(keptKey());
  }

  function choose(name: string | undefined): void {
    chosen = name;
    reset();
  }

  function fillRunAs(): void {
    const labels = runAsLabels(names.map((name) => requests[name]!));
    runAsControl.replaceChildren(
      ...names.map((name, i) => {
        const item = document.createElement("calcite-segmented-control-item");
        item.setAttribute("value", name);
        item.title = name;
        item.textContent = labels[i]!;
        if (name === chosen) item.setAttribute("checked", "");
        return item;
      }),
    );
  }

  async function run(): Promise<void> {
    const request = chosen === undefined ? undefined : requests[chosen];
    if (!request) return;
    reset();
    live = undefined;
    setCollapsed(false);
    const token = ++runs;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, RUN_TIMEOUT_MS);
    abort = () => {
      clearTimeout(timer);
      controller.abort();
      abort = () => {};
    };

    let sent: Request;
    try {
      const { method, url, headers, body: payload } = resolveRequest(request, vars.values());
      sent = new Request(new URL(url, location.href), {
        method,
        headers: headers.map(({ name, value }): [string, string] => [name, value]),
        body: payload,
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      abort();
      buildError = `The request could not be built: ${error instanceof Error ? error.message : String(error)}`;
      return draw();
    }

    running = true;
    draw();
    const start = performance.now();
    try {
      const response = await fetch(sent);
      const content = await response.text();
      if (token !== runs) return;
      live = { status: response.status, statusText: response.statusText, ms: performance.now() - start, body: content };
    } catch {
      // Aborted by a newer run or a context change: that one draws.
      if (token !== runs || (controller.signal.aborted && !timedOut)) return;
      failure = timedOut ? "timeout" : "network";
    }
    abort();
    running = false;
    draw();
  }

  function update(): void {
    section!.hidden = !used || isWeb();
    if (section!.hidden) {
      reset();
      return;
    }
    const variant = variants?.active().id;
    resultStep = lastResult(results, active ? allSteps.indexOf(active) : -1, variant);
    const step = results[resultStep];
    const next = `${resultStep} ${variant ?? ""}`;
    if (next !== context) {
      context = next;
      captured = step && stepOutput(step, variant);
      names = step ? stepRequests(step, variant).filter((name) => name in requests) : [];
      // Each time a step is shown, its first request is the default.
      choose(names[0]);
      fillRunAs();
    }
    draw();
  }

  const setCollapsed = (collapsed: boolean) => {
    frame.hidden = collapsed;
    setAction(section.querySelector("#result-toggle"), collapsed ? "chevron-right" : "chevron-down", "Result");
  };
  section.querySelector("#result-toggle")?.addEventListener("click", () => setCollapsed(!frame.hidden));
  document.addEventListener(PREVIEW_STATE_EVENT, (event) => setCollapsed((event as CustomEvent<PreviewState>).detail === "collapsed"));

  runButton.addEventListener("click", () => void run());
  runAsControl.addEventListener("calciteSegmentedControlChange", () => {
    choose(runAsControl.value);
    draw();
  });
  keepButton.addEventListener("click", () => {
    if (live) kept.set(keptKey(), live);
    draw();
  });
  capturedButton.addEventListener("click", () => {
    kept.delete(keptKey());
    choose(chosen);
    draw();
  });
  // Off on every page load, never remembered.
  revealButton.addEventListener("click", () => {
    revealed = !revealed;
    setAction(revealButton, revealed ? "view-hide" : "view-visible", revealed ? "Hide secrets" : "Show secrets");
    revealButton.toggleAttribute("active", revealed);
    refreshRequest();
  });

  document.addEventListener(STEP_EVENT, (event) => {
    active = (event as CustomEvent<HTMLElement | null>).detail;
    update();
  });
  document.addEventListener(VARIANT_EVENT, update);
  active = allSteps.find((s) => s.hasAttribute("data-active")) ?? null;
  update();
  return { refreshRequest };
}
