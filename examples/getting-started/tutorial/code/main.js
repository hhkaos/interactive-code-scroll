// #region config
const tutorialName = "Getting Started with InteractiveCodeScroll"; // @var tutorialName
// #endregion config

const steps = [
  "Create tutorial.mdx.",
  "Add runnable files under code/.",
  "Mark regions with comments.",
  "Reference those regions from MDX steps.",
  "Build and publish the static site.",
];

// #region render
const title = document.querySelector("#title");
const summary = document.querySelector("#summary");
const button = document.querySelector("#action");
const list = document.querySelector("#steps");

title.textContent = tutorialName;
summary.textContent = "A tiny client-side demo for your first authored tutorial.";

for (const step of steps) {
  const item = document.createElement("li");
  item.textContent = step;
  list.append(item);
}

button.addEventListener("click", () => {
  list.hidden = !list.hidden;
  button.textContent = list.hidden ? "Show authoring steps" : "Hide authoring steps";
});
// #endregion render
