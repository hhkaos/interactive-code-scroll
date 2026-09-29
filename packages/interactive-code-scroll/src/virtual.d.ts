/// <reference types="astro/client" />
declare module "virtual:interactive-code-scroll/tutorial" {
  /** True when the site publishes several tutorials, each under `/<slug>/`. */
  export const series: boolean;
  /** Every tutorial of the site (one, with slug `""`, for a single-tutorial site). */
  export const tutorials: import("./tutorial-data.ts").TutorialData[];
}
