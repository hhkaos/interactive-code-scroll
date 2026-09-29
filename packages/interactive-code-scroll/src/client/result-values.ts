/**
 * What a step says about its result: captured output as `data-output` without variants,
 * `data-outputs` (variant id → path) with them; bound requests as `data-requests`, limited
 * to the non-web variants the step covers (`data-request-variants`) when there are variants.
 */
export interface StepResult {
  output?: string;
  outputs?: Readonly<Record<string, string>>;
  requests?: readonly string[];
  requestVariants?: readonly string[];
}

/** Captured output of `step` for `variant`, if any. */
export function stepOutput(step: StepResult, variant?: string): string | undefined {
  return variant === undefined ? step.output : step.outputs?.[variant];
}

/** Requests `step` can run for `variant` (empty when none). */
export function stepRequests(step: StepResult, variant?: string): readonly string[] {
  if (!step.requests || (variant !== undefined && !step.requestVariants?.includes(variant))) return [];
  return step.requests;
}

/**
 * The Result pane keeps the last result: step `index` when it has an output or a request for
 * `variant`, else the nearest earlier step that has one. The same step always shows the same
 * result, however the reader got there (scrolling, keys, deep link, variant switch). -1: none yet.
 */
export function lastResult(steps: readonly StepResult[], index: number, variant?: string): number {
  for (let i = Math.min(index, steps.length - 1); i >= 0; i -= 1) {
    const step = steps[i]!;
    if (stepOutput(step, variant) || stepRequests(step, variant).length > 0) return i;
  }
  return -1;
}

/** Result header layout: 0 full labels; 1 Keep/Show captured as icons; 2 Run request as an icon too. */
export type HeaderLevel = 0 | 1 | 2;

/** A header control that becomes icon-only from `level` on. */
export interface CompactItem {
  level: 1 | 2;
  /** Width (px) with its label. */
  full: number;
  /** Width (px) as an icon. */
  icon: number;
}

/**
 * Smallest level at which the header fits in `available` px: `base` is the width of what never
 * changes (toggle, badge, Run as, maximize, gaps). The header stays on one row; past level 2 the
 * badge text is cut.
 */
export function headerLevel(available: number, base: number, items: readonly CompactItem[]): HeaderLevel {
  for (const level of [0, 1] as const) {
    const width = items.reduce((sum, item) => sum + (item.level <= level ? item.icon : item.full), base);
    if (width <= available) return level;
  }
  return 2;
}
