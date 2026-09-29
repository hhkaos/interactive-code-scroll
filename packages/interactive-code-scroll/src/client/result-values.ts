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
