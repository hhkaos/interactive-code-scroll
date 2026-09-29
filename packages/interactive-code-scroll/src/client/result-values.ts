/** What a step says about captured output: `data-output` without variants, `data-outputs` (variant id → path) with them. */
export interface StepOutput {
  output?: string;
  outputs?: Readonly<Record<string, string>>;
}

/**
 * The Result pane keeps the last result: the output of step `index`, else of the nearest
 * earlier step with one for `variant`. The same step always shows the same result, however
 * the reader got there (scrolling, keys, deep link, variant switch). `undefined`: none yet.
 */
export function lastOutput(steps: readonly StepOutput[], index: number, variant?: string): string | undefined {
  for (let i = Math.min(index, steps.length - 1); i >= 0; i -= 1) {
    const step = steps[i]!;
    const path = variant === undefined ? step.output : step.outputs?.[variant];
    if (path) return path;
  }
  return undefined;
}
