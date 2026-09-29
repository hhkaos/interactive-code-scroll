# Features

What InteractiveCodeScroll can do, in one page. Each section links to the reference that shows how to use it. For the file formats and every option, see [Authoring and API Reference](authoring.md); for commands, see [CLI Reference](cli.md).

A tutorial is a folder with `tutorial.mdx` (the explanations), `code/` (the final, runnable project) and `images/`. The build turns it into a static site: explanations on the left, code on the right, kept in sync as the reader moves through the steps.

## Reading a tutorial

- **Side-by-side layout**: explanations on the left, code on the right. Both splitters (explanations/code, code/Preview) can be dragged, and their sizes are remembered. A handle on the splitter hides or shows the explanations.
- **Steps drive the code panel**: when a step becomes active, it can switch file, focus a region (the rest of the file turns gray and the region scrolls into view) or show images instead of code. A text-only step keeps the current file and clears the focus.
- **Several ways to move**: scrolling (the step crossing the middle of the panel becomes active), clicking a step, arrow keys and PageUp/PageDown (presentation clickers work too).
- **Numbered steps, progress bar and deep links**: every step heading carries its number; `#step-id` links open the tutorial at that step.
- **Optional introduction**: content before the first step that is not numbered and does not focus any code.
- **Light and dark**: follows the OS by default; the author can set a default and the reader's toggle wins. The code panel and the Preview follow the page.
- **Readable at high zoom**, with line numbers and optional wrapping of long lines.

See [Components](authoring.md#components).

## Code

- **Final code, highlighted**: every file is shown in its final version; steps only focus parts of it. Highlighting happens at build time for JavaScript/TypeScript, HTML, CSS, JSON, Markdown, shell, YAML, Python, Kotlin, Swift, C#, Java, C++, Dart, SQL, `.http` and more, and can be overridden per extension.
- **Regions and variables as comments**: `#region id` / `#endregion` marks what a step focuses; `@var name` marks a literal a form field can change. The source stays valid and runnable; markers never reach the reader or the downloads.
- **Large projects**: the `files` list picks which files get tabs. Everything else, including binary files such as a Gradle wrapper jar, still goes into the ZIP.
- **Code variants**: the same steps in several languages (for example cURL, Python and Node.js) with a language switcher, deep links such as `?variant=curl`, steps that apply to only some languages, a Preview for web variants and a ZIP per variant. See [Code Variants](authoring.md#code-variants).

See [Code Markers](authoring.md#code-markers) and [Files Not Shown in Tabs](authoring.md#files-not-shown-in-tabs).

## Forms that edit the code

- `<VarField>` inputs in the explanations update the code as the reader types (client ID, API key, portal URL…). The literal in the code is the default.
- **Secret fields** are masked in the form and in the code, with a reveal toggle.
- **Persisted fields** are remembered per site, so a credential typed once fills every tutorial on the same site.
- Values are escaped for each language and quote style, and are included in Preview and downloads.

See [`<VarField>`](authoring.md#varfield) and [Variables](authoring.md#variables).

## Preview

- Runs the tutorial's web code (`code/index.html`) from a real page of the site: embedded, in a new tab, or both.
- Refreshes after form changes, or with Run. A step can expand or collapse it.
- OAuth sign-in works from the embedded Preview through a popup, and in the new tab through a normal redirect.

See [Preview](authoring.md#preview).

## Images

- A step can show one image or a carousel instead of code. Step keys page through the images first; clicking an image opens a full-screen viewer.

See [`<Step>`](authoring.md#step).

## Downloads

- Copy the current file, download it, or download the whole project as a ZIP with the reader's form values applied, ready to run locally. The ZIP button shows how many files it contains.

## Presenting

- **Presentation mode** hides the header; the explanations can be hidden too. Step keys and clickers keep working, including while the focus is inside the Preview.
- **Serve locally** with the CLI when the venue's network is unreliable.

See [CLI Reference](cli.md).

## Writing tutorials

- Markdown notes (blockquotes) and `<Hint>` popovers for short clarifications.
- **Strict validation**: a wrong file, region, variable, image, variant or frontmatter value fails the build with the MDX file, line and column. In dev mode the error appears as a browser overlay and validation re-runs when code or images change.
- **Generic CLI**: `dev`, `build`, `serve`, `doctor` and `init-scripts` for any tutorial folder.

See [Validation](authoring.md#validation).

## In progress

These are specified and being built; see `SPEC.md` and `TODO.md`:

- A Result pane for code that cannot run in the browser: captured output (JSON, text, images) and a live runner for `.http` requests, with secret masking, error explanations and an offline fallback.
- Sites with several tutorials and an index page; sibling tutorials per language.
