// @ts-check
import { commands } from "./package-manager.mjs";
import { tutorialPlans } from "./plan.mjs";

/** @typedef {import("./options.mjs").Answers} Answers */

/**
 * What to do after the project is written.
 * @param {Answers} answers
 * @param {{ installed: boolean; gitInitialized: boolean }} done
 * @returns {string[]}
 */
export function nextSteps(answers, done) {
  const { install, run, exec } = commands(answers.pm);
  const steps = [`cd ${answers.dir}`];
  if (!done.installed) steps.push(install);
  steps.push(`${run("dev")}   # open the printed URL; edits reload live`);
  steps.push(`${exec("doctor")}   # if something does not start`);
  const lines = [...steps, ""];
  const tutorials = tutorialPlans(answers);
  lines.push(
    answers.layout === "series"
      ? `Edit tutorials/<name>/tutorial.mdx and its code/ folder (${tutorials.length} tutorial${tutorials.length === 1 ? "" : "s"}).`
      : "Edit tutorial/tutorial.mdx and the files in tutorial/code/.",
  );
  if (answers.pages) {
    lines.push(
      "",
      "Publish on GitHub Pages:",
      done.gitInitialized ? "  1. Create a GitHub repository and push this folder to main." : "  1. Run git init -b main, create a GitHub repository and push to main.",
      "  2. Settings -> Pages -> Source: GitHub Actions.",
      "  3. Every push to main publishes https://<owner>.github.io/<repo>/",
    );
    if (answers.layout === "series") lines.push(`     (the index; each tutorial below it, e.g. /<repo>/${tutorials[0]?.dir.slice("tutorials/".length)}/)`);
  }
  return lines;
}
