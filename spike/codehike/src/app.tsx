import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { SelectionProvider, useSelectedIndex } from "codehike/utils/selection";
import Tutorial from "../../tutorial/tutorial.mdx";
import { CodePanel } from "./code-panel.tsx";
import { Preview } from "./preview.tsx";
import { Step, Steps, StepsMetaProvider, useStepsMeta } from "./steps.tsx";
import { VarField } from "./var-field.tsx";
import { VarsProvider } from "./vars.tsx";

// MDX content has no hooks: calling it (like Code Hike's parseRoot) exposes the top-level nodes.
const tutorialContent = (Tutorial({ components: { Step, VarField } }) as ReactElement<{ children: ReactNode }>).props
  .children;

type Mode = "light" | "dark";

function useTheme(): [Mode, () => void] {
  const [mode, setMode] = useState<Mode>(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  useEffect(() => {
    document.body.classList.toggle("calcite-mode-dark", mode === "dark");
    document.body.classList.toggle("calcite-mode-light", mode === "light");
  }, [mode]);
  return [mode, () => setMode((m) => (m === "dark" ? "light" : "dark"))];
}

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|CALCITE-INPUT)$/.test(el.tagName));

function useStepNavigation() {
  const [selectedIndex, selectIndex] = useSelectedIndex();
  const { steps } = useStepsMeta();

  // Keyboard / clicker navigation with snapping.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const delta = ["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)
        ? 1
        : ["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)
          ? -1
          : 0;
      if (!delta) return;
      e.preventDefault();
      const next = Math.min(Math.max(selectedIndex + delta, 0), steps.length - 1);
      document.getElementById(steps[next]!.id)?.scrollIntoView({ block: "center", behavior: "smooth" });
      selectIndex(next);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [selectedIndex, selectIndex, steps]);

  // Deep link: restore once steps are known, then mirror selection into the hash.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restored || steps.length === 0) return;
    const index = steps.findIndex((s) => `#${s.id}` === location.hash);
    if (index >= 0) {
      document.getElementById(steps[index]!.id)?.scrollIntoView({ block: "center" });
      selectIndex(index);
    }
    setRestored(true);
  }, [restored, steps, selectIndex]);
  useEffect(() => {
    const id = steps[selectedIndex]?.id;
    if (restored && id) history.replaceState(null, "", `#${id}`);
  }, [restored, selectedIndex, steps]);

  return { step: steps[selectedIndex], index: selectedIndex, total: steps.length };
}

function Layout() {
  const [mode, toggleTheme] = useTheme();
  const [previewOpen, setPreviewOpen] = useState(true);
  const { step, index, total } = useStepNavigation();

  return (
    <>
      <main className="docs">
        <Steps>{tutorialContent}</Steps>
      </main>
      <aside className="right">
        <div className="toolbar">
          <span className="progress">
            Step {index + 1} of {total}
          </span>
          <calcite-button appearance="transparent" iconStart="browser" onClick={() => setPreviewOpen((o) => !o)}>
            Preview
          </calcite-button>
          <calcite-button
            appearance="transparent"
            iconStart={mode === "dark" ? "brightness" : "moon"}
            label="Toggle theme"
            onClick={toggleTheme}
          />
        </div>
        <CodePanel step={step} />
        <Preview open={previewOpen} />
      </aside>
    </>
  );
}

export function App() {
  return (
    <VarsProvider>
      <StepsMetaProvider>
        <SelectionProvider className="layout">
          <Layout />
        </SelectionProvider>
      </StepsMetaProvider>
    </VarsProvider>
  );
}
