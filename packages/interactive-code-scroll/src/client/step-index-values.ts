import { progressStates, type ProgressState } from "./navigation.ts";
import { coversVariant, listLabels } from "./variant-values.ts";

export interface IndexStep {
  /** The step's heading text; empty when it has none. */
  title: string;
  /** Space-separated variant ids (`only=`), when the step is limited to some. */
  only?: string;
}

export interface IndexEntry {
  number: number;
  title: string;
  state: ProgressState;
  /** "cURL and Python": the step applies to other variants only (`otherVariantSteps: notice`). */
  otherVariants?: string;
}

export interface IndexInput {
  steps: readonly IndexStep[];
  current: number;
  completed?: boolean;
  /** The active variant and every variant's label, with variants. */
  variant?: { active: string; labels: Readonly<Record<string, string>> };
}

/** Rows of the step index: number, heading ("Step N" without one), positional state and other-variant labels. */
export function indexEntries({ steps, current, completed = false, variant }: IndexInput): IndexEntry[] {
  const states = progressStates(current, steps.length, completed);
  return steps.map((step, i) => {
    const entry: IndexEntry = { number: i + 1, title: step.title.trim() || `Step ${i + 1}`, state: states[i]! };
    if (variant && !coversVariant(step.only, variant.active)) {
      const ids = step.only!.split(/\s+/).filter(Boolean);
      entry.otherVariants = listLabels(ids.map((id) => variant.labels[id] ?? id));
    }
    return entry;
  });
}

/** The list's heading: where the reader is. */
export function indexHeading(current: number, count: number, completed = false): string {
  if (completed) return "Done";
  return current < 0 ? "Introduction" : `Step ${current + 1} of ${count}`;
}
